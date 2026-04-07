<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\AssembleProctoringRecording;
use App\Models\Olympiad;
use App\Models\OlympiadRegistration;
use App\Models\ProctoringChunk;
use App\Models\ProctoringRecording;
use App\Models\ProctoringSession;
use Illuminate\Support\Facades\Storage;

class AdminProctoringController extends Controller
{
    public function show(Olympiad $olympiad, OlympiadRegistration $registration)
    {
        abort_unless((int) $registration->olympiad_id === (int) $olympiad->id, 404);

        $registration->load([
            'user:id,name,email',
            'proctoringSessions.chunks' => fn ($query) => $query->orderBy('kind')->orderBy('sequence'),
            'proctoringSessions.recordings' => fn ($query) => $query->orderBy('kind'),
        ]);

        $registration->proctoringSessions->each(function (ProctoringSession $session) {
            $this->ensureAssemblyQueued($session);
        });

        return response()->json([
            'registration' => [
                'id' => $registration->id,
                'current_status' => $registration->current_status,
                'user' => [
                    'id' => $registration->user->id,
                    'name' => $registration->user->name,
                    'email' => $registration->user->email,
                ],
            ],
            'sessions' => $registration->proctoringSessions
                ->sortByDesc('started_at')
                ->values()
                ->map(function ($session) {
                    $combinedChunks = $session->chunks
                        ->where('kind', 'combined')
                        ->sortBy('sequence')
                        ->values();
                    $combinedRecording = $session->recordings->firstWhere('kind', 'combined');

                    return [
                        'id' => $session->id,
                        'stage' => $session->stage,
                        'status' => $session->status,
                        'assembly_status' => $session->assembly_status,
                        'assembly_error' => $session->assembly_error,
                        'started_at' => $session->started_at,
                        'finished_at' => $session->finished_at,
                        'assembly_requested_at' => $session->assembly_requested_at,
                        'assembly_completed_at' => $session->assembly_completed_at,
                        'combined_chunks' => $combinedChunks->map(function ($chunk) {
                            return [
                                'id' => $chunk->id,
                                'sequence' => $chunk->sequence,
                                'mime_type' => $chunk->mime_type,
                                'size_bytes' => $chunk->size_bytes,
                                'media_url' => "/api/admin/proctoring-chunks/{$chunk->id}/media",
                            ];
                        })->values(),
                        'combined_recording' => [
                            'available' => (bool) $combinedRecording,
                            'id' => $combinedRecording?->id,
                            'mime_type' => $combinedRecording?->mime_type,
                            'size_bytes' => $combinedRecording?->size_bytes,
                            'media_url' => $combinedRecording ? "/api/admin/proctoring-recordings/{$combinedRecording->id}/media" : null,
                        ],
                    ];
                }),
        ]);
    }

    public function chunkMedia(ProctoringChunk $chunk)
    {
        $disk = Storage::disk($chunk->disk);

        abort_unless($disk->exists($chunk->path), 404);

        return response()->file($disk->path($chunk->path), [
            'Content-Type' => $chunk->mime_type ?: 'application/octet-stream',
            'Cache-Control' => 'private, max-age=3600',
            'Content-Disposition' => 'inline; filename="' . basename($chunk->path) . '"',
        ]);
    }

    public function media(ProctoringRecording $recording)
    {
        $disk = Storage::disk($recording->disk);

        abort_unless($disk->exists($recording->path), 404);

        return response()->file($disk->path($recording->path), [
            'Content-Type' => $recording->mime_type ?: 'application/octet-stream',
            'Cache-Control' => 'private, max-age=3600',
            'Content-Disposition' => 'inline; filename="' . basename($recording->path) . '"',
        ]);
    }

    private function ensureAssemblyQueued(ProctoringSession $session): void
    {
        $hasCombinedChunks = $session->chunks->contains(fn (ProctoringChunk $chunk) => $chunk->kind === 'combined');
        $hasCombinedRecording = $session->recordings->contains(fn (ProctoringRecording $recording) => $recording->kind === 'combined');
        $assemblyStatus = $session->assembly_status ?: ProctoringSession::ASSEMBLY_PENDING;

        if (
            !$session->finished_at ||
            !$hasCombinedChunks ||
            $hasCombinedRecording ||
            in_array($assemblyStatus, [ProctoringSession::ASSEMBLY_READY, ProctoringSession::ASSEMBLY_QUEUED, ProctoringSession::ASSEMBLY_PROCESSING], true)
        ) {
            return;
        }

        $session->forceFill([
            'assembly_status' => ProctoringSession::ASSEMBLY_QUEUED,
            'assembly_error' => null,
            'assembly_requested_at' => now(),
            'assembly_completed_at' => null,
        ])->save();

        AssembleProctoringRecording::dispatch($session->id);
    }
}
