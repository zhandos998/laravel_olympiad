<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('olympiads', function (Blueprint $table) {
            $table->timestamp('stage1_starts_at')->nullable()->after('stage1_pass_percent');
            $table->timestamp('stage1_ends_at')->nullable()->after('stage1_starts_at');
            $table->timestamp('stage2_starts_at')->nullable()->after('stage1_ends_at');
            $table->timestamp('stage2_ends_at')->nullable()->after('stage2_starts_at');
        });

        DB::table('olympiads')
            ->whereNotNull('starts_at')
            ->update([
                'stage1_starts_at' => DB::raw('starts_at'),
                'stage1_ends_at' => DB::raw('ends_at'),
            ]);
    }

    public function down(): void
    {
        Schema::table('olympiads', function (Blueprint $table) {
            $table->dropColumn([
                'stage1_starts_at',
                'stage1_ends_at',
                'stage2_starts_at',
                'stage2_ends_at',
            ]);
        });
    }
};
