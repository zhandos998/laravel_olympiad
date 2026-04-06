<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\AssembleProctoringRecording;
use App\Models\Olympiad;
use App\Models\OlympiadRegistration;
use App\Models\ProctoringChunk;
use App\Models\ProctoringSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StudentProctoringController extends Controller
{
    private const ALLOWED_KINDS = ['combined'];

    public function start(Request $request, Olympiad $olympiad)
    {
        $registration = $this->getRegistrationOrFail($request, $olympiad->id);

        if (!$registration->stage1_started_at) {
            throw ValidationException::withMessages([
                'stage1' => __('messages.stage1_not_started'),
            ]);
        }

        $session = ProctoringSession::query()
            ->where('olympiad_registration_id', $registration->id)
            ->where('stage', 1)
            ->where('status', 'active')
            ->latest('id')
            ->first();

        if (!$session) {
            $session = ProctoringSession::create([
                'olympiad_registration_id' => $registration->id,
                'stage' => 1,
                'status' => 'active',
                'started_at' => now(),
            ]);
        }

        return response()->json([
            'session_id' => $session->id,
            'status' => $session->status,
            'uploaded_counts' => $this->uploadedCounts($session),
        ]);
    }

    public function uploadChunk(Request $request, ProctoringSession $session)
    {
        $this->ensureOwnedByUser($request, $session);

        if ($session->status !== 'active' || $session->finished_at) {
            return response()->json(['message' => 'Proctoring session already finished.'], 422);
        }

        $data = $request->validate([
            'kind' => ['required', Rule::in(self::ALLOWED_KINDS)],
            'sequence' => ['required', 'integer', 'min:0'],
            'chunk' => ['required', 'file', 'max:102400'],
        ]);

        $file = $data['chunk'];
        $kind = $data['kind'];
        $sequence = (int) $data['sequence'];
        $disk = 'local';
        $extension = $file->getClientOriginalExtension() ?: $this->resolveExtension($file->getMimeType());
        $filename = sprintf('%s-%06d-%s.%s', $kind, $sequence, Str::uuid(), $extension);
        $directory = sprintf('proctoring/stage-%d/session-%d/%s', $session->stage, $session->id, $kind);
        $path = $file->storeAs($directory, $filename, $disk);

        $existingChunk = ProctoringChunk::query()
            ->where('proctoring_session_id', $session->id)
            ->where('kind', $kind)
            ->where('sequence', $sequence)
            ->first();

        if ($existingChunk) {
            Storage::disk($existingChunk->disk)->delete($existingChunk->path);
            $existingChunk->update([
                'disk' => $disk,
                'path' => $path,
                'mime_type' => $file->getMimeType(),
                'size_bytes' => $file->getSize(),
            ]);

            $chunk = $existingChunk;
        } else {
            $chunk = ProctoringChunk::create([
                'proctoring_session_id' => $session->id,
                'kind' => $kind,
                'sequence' => $sequence,
                'disk' => $disk,
                'path' => $path,
                'mime_type' => $file->getMimeType(),
                'size_bytes' => $file->getSize(),
            ]);
        }

        return response()->json([
            'saved' => true,
            'chunk_id' => $chunk->id,
            'session_id' => $session->id,
            'kind' => $kind,
            'sequence' => $sequence,
        ]);
    }

    public function finish(Request $request, ProctoringSession $session)
    {
        $this->ensureOwnedByUser($request, $session);

        $combinedChunksCount = $session->chunks()->where('kind', 'combined')->count();
        $currentAssemblyStatus = $session->assembly_status ?: ProctoringSession::ASSEMBLY_PENDING;
        $shouldQueueAssembly = false;

        if (!$session->finished_at) {
            $session->forceFill([
                'status' => 'finished',
                'finished_at' => now(),
            ])->save();
        }

        if ($combinedChunksCount === 0) {
            $session->forceFill([
                'assembly_status' => ProctoringSession::ASSEMBLY_EMPTY,
                'assembly_error' => null,
                'assembly_completed_at' => now(),
            ])->save();
        } elseif (
            !in_array($currentAssemblyStatus, [ProctoringSession::ASSEMBLY_READY, ProctoringSession::ASSEMBLY_QUEUED, ProctoringSession::ASSEMBLY_PROCESSING], true)
        ) {
            $session->forceFill([
                'assembly_status' => ProctoringSession::ASSEMBLY_QUEUED,
                'assembly_error' => null,
                'assembly_requested_at' => now(),
                'assembly_completed_at' => null,
            ])->save();

            $shouldQueueAssembly = true;
        }

        if ($shouldQueueAssembly) {
            AssembleProctoringRecording::dispatch($session->id);
        }

        $session->load('recordings');

        return response()->json([
            'session_id' => $session->id,
            'status' => $session->status,
            'finished_at' => $session->finished_at,
            'assembly_status' => $session->assembly_status,
            'combined_chunks_count' => $combinedChunksCount,
            'combined_recording_available' => (bool) $session->recordings->firstWhere('kind', 'combined'),
        ]);
    }

    private function uploadedCounts(ProctoringSession $session): array
    {
        $counts = array_fill_keys(self::ALLOWED_KINDS, 0);

        foreach ($session->chunks()->select('kind', 'sequence')->get() as $chunk) {
            $counts[$chunk->kind] = max($counts[$chunk->kind], $chunk->sequence + 1);
        }

        return $counts;
    }

    private function getRegistrationOrFail(Request $request, int $olympiadId): OlympiadRegistration
    {
        $registration = OlympiadRegistration::query()
            ->where('olympiad_id', $olympiadId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$registration) {
            throw ValidationException::withMessages([
                'registration' => __('messages.not_registered_for_olympiad'),
            ]);
        }

        return $registration;
    }

    private function ensureOwnedByUser(Request $request, ProctoringSession $session): void
    {
        $session->loadMissing('registration');

        if ((int) $session->registration->user_id !== (int) $request->user()->id) {
            abort(403);
        }
    }

    private function resolveExtension(?string $mimeType): string
    {
        return match ($mimeType) {
            'audio/webm', 'video/webm' => 'webm',
            'audio/mp4', 'video/mp4' => 'mp4',
            default => 'webm',
        };
    }
}
