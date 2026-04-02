<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proctoring_recordings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proctoring_session_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 32);
            $table->string('disk', 32)->default('local');
            $table->string('path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->timestamps();

            $table->unique(['proctoring_session_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proctoring_recordings');
    }
};
