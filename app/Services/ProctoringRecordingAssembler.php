<?php

namespace App\Services;

use App\Models\ProctoringRecording;
use App\Models\ProctoringSession;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Process\Process;

class ProctoringRecordingAssembler
{
    private const KINDS = ['combined'];

    public function assemble(ProctoringSession $session): void
    {
        $session->loadMissing('chunks', 'recordings');

        foreach (self::KINDS as $kind) {
            $chunks = $session->chunks
                ->where('kind', $kind)
                ->sortBy('sequence')
                ->values();

            if ($chunks->isEmpty()) {
                continue;
            }

            $firstChunk = $chunks->first();
            $disk = $firstChunk->disk;
            $storage = Storage::disk($disk);
            $extension = $this->resolveExtension($firstChunk->mime_type);
            $outputPath = sprintf('proctoring/stage-%d/session-%d/final/%s.%s', $session->stage, $session->id, $kind, $extension);
            $existingRecording = $session->recordings->firstWhere('kind', $kind);

            $this->writeMergedFile($storage->path($outputPath), $chunks->all());

            $recording = ProctoringRecording::updateOrCreate(
                [
                    'proctoring_session_id' => $session->id,
                    'kind' => $kind,
                ],
                [
                    'disk' => $disk,
                    'path' => $outputPath,
                    'mime_type' => $firstChunk->mime_type,
                    'size_bytes' => $storage->size($outputPath),
                ],
            );

            if ($existingRecording && $existingRecording->path !== $recording->path) {
                Storage::disk($existingRecording->disk)->delete($existingRecording->path);
            }
        }
    }

    private function writeMergedFile(string $outputAbsolutePath, array $chunks): void
    {
        $directory = dirname($outputAbsolutePath);

        if (!is_dir($directory) && !mkdir($directory, 0777, true) && !is_dir($directory)) {
            throw new RuntimeException('Failed to create proctoring output directory.');
        }

        $chunkDirectory = dirname(Storage::disk($chunks[0]->disk)->path($chunks[0]->path));
        $manifestPath = $chunkDirectory . DIRECTORY_SEPARATOR . 'concat-' . Str::uuid() . '.txt';
        $manifestBody = collect($chunks)
            ->map(fn ($chunk) => "file '" . $this->escapeConcatPath(basename($chunk->path)) . "'")
            ->implode(PHP_EOL) . PHP_EOL;

        if (file_put_contents($manifestPath, $manifestBody) === false) {
            throw new RuntimeException('Failed to create ffmpeg concat manifest.');
        }

        try {
            $process = new Process(
                [
                    config('services.ffmpeg.binary', 'ffmpeg'),
                    '-f',
                    'concat',
                    '-safe',
                    '0',
                    '-i',
                    $manifestPath,
                    '-c',
                    'copy',
                    '-y',
                    $outputAbsolutePath,
                ],
                $chunkDirectory,
                null,
                null,
                max(120, count($chunks) * 10),
            );

            $process->run();

            if (!$process->isSuccessful()) {
                throw new RuntimeException(
                    'Failed to assemble proctoring recording with ffmpeg. ' . trim($process->getErrorOutput() ?: $process->getOutput())
                );
            }

            if (!is_file($outputAbsolutePath) || filesize($outputAbsolutePath) === 0) {
                throw new RuntimeException('ffmpeg did not produce a playable proctoring recording.');
            }
        } finally {
            if (is_file($manifestPath)) {
                @unlink($manifestPath);
            }
        }
    }

    private function escapeConcatPath(string $path): string
    {
        return str_replace("'", "'\\''", str_replace('\\', '/', $path));
    }

    private function resolveExtension(?string $mimeType): string
    {
        return match ($mimeType) {
            'audio/mp4', 'video/mp4' => 'mp4',
            default => 'webm',
        };
    }
}
