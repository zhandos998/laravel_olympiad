<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proctoring_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('olympiad_registration_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('stage')->default(1);
            $table->string('status')->default('active');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proctoring_sessions');
    }
};
