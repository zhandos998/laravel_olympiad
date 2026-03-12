<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('olympiad_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('olympiad_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('current_status')->default('registered');
            $table->timestamp('registered_at');
            $table->timestamps();

            $table->unique(['olympiad_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('olympiad_registrations');
    }
};
