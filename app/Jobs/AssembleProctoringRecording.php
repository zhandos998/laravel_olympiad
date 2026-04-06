<?php

namespace App\Jobs;

use App\Models\ProctoringSession;
use App\Services\ProctoringRecordingAssembler;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class AssembleProctoringRecording implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 1800;
    public int $uniqueFor = 1800;

    public function __construct(public int $sessionId)
    {
    }

    public function uniqueId(): string
    {
        return (string) $this->sessionId;
    }

    public function handle(ProctoringRecordingAssembler $assembler): void
    {
        $session = ProctoringSession::query()->find($this->sessionId);

        if (!$session || $session->assembly_status === ProctoringSession::ASSEMBLY_READY) {
            return;
        }

        $session->forceFill([
            'assembly_status' => ProctoringSession::ASSEMBLY_PROCESSING,
            'assembly_error' => null,
        ])->save();

        try {
            $assembler->assemble($session->fresh(['chunks', 'recordings']));

            $hasCombinedRecording = $session->fresh('recordings')
                ->recordings
                ->contains(fn ($recording) => $recording->kind === 'combined');

            $session->forceFill([
                'assembly_status' => $hasCombinedRecording ? ProctoringSession::ASSEMBLY_READY : ProctoringSession::ASSEMBLY_EMPTY,
                'assembly_error' => null,
                'assembly_completed_at' => now(),
            ])->save();
        } catch (\Throwable $exception) {
            $session->forceFill([
                'assembly_status' => ProctoringSession::ASSEMBLY_FAILED,
                'assembly_error' => mb_substr($exception->getMessage(), 0, 65535),
            ])->save();

            throw $exception;
        }
    }
}
