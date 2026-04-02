<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('olympiads', function (Blueprint $table) {
            $table->unsignedSmallInteger('stage1_duration_minutes')->default(90)->after('stage1_question_count');
        });
    }

    public function down(): void
    {
        Schema::table('olympiads', function (Blueprint $table) {
            $table->dropColumn('stage1_duration_minutes');
        });
    }
};
