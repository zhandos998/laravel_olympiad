<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('olympiad_registrations', function (Blueprint $table) {
            $table->string('test_language', 10)->nullable()->after('current_status');
            $table->string('profile_subjects', 120)->nullable()->after('test_language');
        });
    }

    public function down(): void
    {
        Schema::table('olympiad_registrations', function (Blueprint $table) {
            $table->dropColumn(['test_language', 'profile_subjects']);
        });
    }
};
