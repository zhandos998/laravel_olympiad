<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('olympiad_registrations', function (Blueprint $table) {
            $table->timestamp('stage1_started_at')->nullable()->after('registered_at');
        });
    }

    public function down(): void
    {
        Schema::table('olympiad_registrations', function (Blueprint $table) {
            $table->dropColumn('stage1_started_at');
        });
    }
};
