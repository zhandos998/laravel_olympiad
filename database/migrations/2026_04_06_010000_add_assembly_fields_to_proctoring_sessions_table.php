<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proctoring_sessions', function (Blueprint $table) {
            $table->string('assembly_status', 32)->default('pending');
            $table->text('assembly_error')->nullable();
            $table->timestamp('assembly_requested_at')->nullable();
            $table->timestamp('assembly_completed_at')->nullable();

            $table->index(['status', 'assembly_status'], 'proctoring_sessions_status_assembly_idx');
        });
    }

    public function down(): void
    {
        Schema::table('proctoring_sessions', function (Blueprint $table) {
            $table->dropIndex('proctoring_sessions_status_assembly_idx');
            $table->dropColumn([
                'assembly_status',
                'assembly_error',
                'assembly_requested_at',
                'assembly_completed_at',
            ]);
        });
    }
};
