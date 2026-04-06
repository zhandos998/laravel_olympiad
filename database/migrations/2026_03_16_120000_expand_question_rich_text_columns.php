<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            return;
        }

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE questions MODIFY text LONGTEXT NOT NULL');
            DB::statement('ALTER TABLE questions MODIFY explanation LONGTEXT NULL');
            DB::statement('ALTER TABLE question_options MODIFY text LONGTEXT NOT NULL');
            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE questions ALTER COLUMN text TYPE TEXT');
            DB::statement('ALTER TABLE questions ALTER COLUMN explanation TYPE TEXT');
            DB::statement('ALTER TABLE question_options ALTER COLUMN text TYPE TEXT');
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            return;
        }

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE questions MODIFY text TEXT NOT NULL');
            DB::statement('ALTER TABLE questions MODIFY explanation TEXT NULL');
            DB::statement('ALTER TABLE question_options MODIFY text VARCHAR(255) NOT NULL');
            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE questions ALTER COLUMN text TYPE TEXT');
            DB::statement('ALTER TABLE questions ALTER COLUMN explanation TYPE TEXT');
            DB::statement('ALTER TABLE question_options ALTER COLUMN text TYPE VARCHAR(255)');
        }
    }
};
