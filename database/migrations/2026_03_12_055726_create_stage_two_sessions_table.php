<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stage_two_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('olympiad_registration_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('scheduled');
            $table->string('meeting_link')->nullable();
            $table->decimal('score_percent', 5, 2)->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->unique(['olympiad_registration_id', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stage_two_sessions');
    }
};
