<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stage_attempt_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stage_attempt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->foreignId('selected_option_id')->nullable()->constrained('question_options')->nullOnDelete();
            $table->boolean('is_correct')->default(false);
            $table->timestamps();

            $table->unique(['stage_attempt_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stage_attempt_answers');
    }
};
