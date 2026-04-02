<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->unsignedTinyInteger('stage1_question_count')->nullable()->after('description');
        });

        $subjects = DB::table('subjects')
            ->join('olympiads', 'olympiads.id', '=', 'subjects.olympiad_id')
            ->select('subjects.id', 'olympiads.stage1_question_count')
            ->get();

        foreach ($subjects as $subject) {
            DB::table('subjects')
                ->where('id', $subject->id)
                ->update(['stage1_question_count' => $subject->stage1_question_count]);
        }
    }

    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropColumn('stage1_question_count');
        });
    }
};
