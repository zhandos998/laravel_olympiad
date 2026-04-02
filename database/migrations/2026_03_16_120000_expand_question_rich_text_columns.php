<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('ALTER TABLE questions MODIFY text LONGTEXT NOT NULL');
        DB::statement('ALTER TABLE questions MODIFY explanation LONGTEXT NULL');
        DB::statement('ALTER TABLE question_options MODIFY text LONGTEXT NOT NULL');
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('ALTER TABLE questions MODIFY text TEXT NOT NULL');
        DB::statement('ALTER TABLE questions MODIFY explanation TEXT NULL');
        DB::statement('ALTER TABLE question_options MODIFY text VARCHAR(255) NOT NULL');
    }
};
