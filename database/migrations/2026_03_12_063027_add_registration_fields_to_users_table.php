<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->after('email');
            $table->string('region', 120)->nullable()->after('phone');
            $table->string('city', 120)->nullable()->after('region');
            $table->string('school', 255)->nullable()->after('city');
            $table->string('test_language', 10)->nullable()->after('school');
            $table->string('profile_subjects', 60)->nullable()->after('test_language');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'region',
                'city',
                'school',
                'test_language',
                'profile_subjects',
            ]);
        });
    }
};
