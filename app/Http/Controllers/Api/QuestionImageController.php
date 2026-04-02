<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class QuestionImageController extends Controller
{
    private const DIRECTORY = 'question-images';
    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];

    public function upload(Request $request)
    {
        $data = $request->validate([
            'image' => ['required', 'file', 'max:15360'],
        ]);

        $file = $data['image'];

        if (!$this->isSupportedImage($file)) {
            return response()->json([
                'message' => app()->getLocale() === 'kaz'
                    ? 'Кірістірілген файл сурет ретінде танылмады. PNG, JPG, GIF, BMP, WEBP немесе SVG қолданыңыз.'
                    : 'Вставленное изображение не распознано. Используйте PNG, JPG, GIF, BMP, WEBP или SVG.',
            ], 422);
        }

        $extension = $this->resolveImageExtension($file);
        $filename = Str::uuid() . '.' . $extension;
        $path = $file->storeAs(self::DIRECTORY, $filename, 'public');

        return response()->json([
            'location' => "/api/media/{$path}",
            'path' => $path,
        ], 201);
    }

    public function show(string $path)
    {
        if (!str_starts_with($path, self::DIRECTORY . '/') || preg_match('#(^|/)\.\.(/|$)#', $path)) {
            abort(404);
        }

        $disk = Storage::disk('public');

        if (!$disk->exists($path)) {
            abort(404);
        }

        return response()->file($disk->path($path), [
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }

    private function isSupportedImage(UploadedFile $file): bool
    {
        $contents = @file_get_contents($file->getRealPath());

        if ($contents === false || $contents === '') {
            return false;
        }

        if (@getimagesizefromstring($contents) !== false) {
            return true;
        }

        return str_contains(strtolower(substr($contents, 0, 512)), '<svg');
    }

    private function resolveImageExtension(UploadedFile $file): string
    {
        $clientExtension = strtolower($file->getClientOriginalExtension());

        if (in_array($clientExtension, self::ALLOWED_EXTENSIONS, true)) {
            return $clientExtension;
        }

        $guessedExtension = strtolower((string) $file->guessExtension());

        if (in_array($guessedExtension, self::ALLOWED_EXTENSIONS, true)) {
            return $guessedExtension;
        }

        $imageType = @exif_imagetype($file->getRealPath());

        return match ($imageType) {
            IMAGETYPE_GIF => 'gif',
            IMAGETYPE_JPEG => 'jpg',
            IMAGETYPE_PNG => 'png',
            IMAGETYPE_BMP => 'bmp',
            IMAGETYPE_WEBP => 'webp',
            default => str_contains(strtolower((string) @file_get_contents($file->getRealPath(), false, null, 0, 512)), '<svg') ? 'svg' : 'png',
        };
    }
}
