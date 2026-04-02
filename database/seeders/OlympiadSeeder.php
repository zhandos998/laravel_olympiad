<?php

namespace Database\Seeders;

use App\Models\Olympiad;
use Illuminate\Database\Seeder;

class OlympiadSeeder extends Seeder
{
    public function run(): void
    {
        Olympiad::updateOrCreate(
            ['title' => 'University Spring Olympiad'],
            [
                'description' => 'Demo olympiad with default subjects',
                'registration_open' => true,
                'is_active' => true,
                'stage1_question_count' => 25,
                'stage1_pass_percent' => 70,
            ]
        );
    }
}
