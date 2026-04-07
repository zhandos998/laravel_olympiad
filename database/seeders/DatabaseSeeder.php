<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            OlympiadSeeder::class,
            SubjectSeeder::class,
            SubjectCuratorSeeder::class,
            QuestionSeeder::class,
            OlympiadRegistrationSeeder::class,
        ]);
    }
}
