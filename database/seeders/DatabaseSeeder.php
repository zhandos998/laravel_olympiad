<?php

namespace Database\Seeders;

use App\Models\Olympiad;
use App\Models\OlympiadRegistration;
use App\Models\Subject;
use App\Models\SubjectCurator;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@olympiad.local'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password123'),
                'role' => 'admin',
            ]
        );

        $curator = User::updateOrCreate(
            ['email' => 'curator@olympiad.local'],
            [
                'name' => 'Curator User',
                'password' => Hash::make('password123'),
                'role' => 'curator',
            ]
        );

        $student = User::updateOrCreate(
            ['email' => 'student@olympiad.local'],
            [
                'name' => 'Student User',
                'password' => Hash::make('password123'),
                'role' => 'student',
            ]
        );

        $olympiad = Olympiad::updateOrCreate(
            ['title' => 'University Spring Olympiad'],
            [
                'description' => 'Demo olympiad with two subjects and stage 1 threshold',
                'registration_open' => true,
                'is_active' => true,
                'stage1_question_count' => 25,
                'stage1_pass_percent' => 70,
            ]
        );

        $subjects = [
            Subject::updateOrCreate(
                ['olympiad_id' => $olympiad->id, 'name' => 'Mathematics'],
                ['stage2_mode' => 'zoom', 'stage2_link' => 'https://zoom.us/j/11111111111']
            ),
            Subject::updateOrCreate(
                ['olympiad_id' => $olympiad->id, 'name' => 'Informatics'],
                ['stage2_mode' => 'zoom', 'stage2_link' => 'https://zoom.us/j/22222222222']
            ),
        ];

        foreach ($subjects as $subject) {
            SubjectCurator::firstOrCreate([
                'subject_id' => $subject->id,
                'user_id' => $curator->id,
            ]);

            if ($subject->questions()->count() < 25) {
                for ($i = $subject->questions()->count() + 1; $i <= 25; $i++) {
                    $question = $subject->questions()->create([
                        'text' => "{$subject->name} question {$i}?",
                        'is_active' => true,
                    ]);

                    for ($opt = 1; $opt <= 5; $opt++) {
                        $question->options()->create([
                            'text' => "Option {$opt}",
                            'is_correct' => $opt === 1,
                        ]);
                    }
                }
            }
        }

        OlympiadRegistration::firstOrCreate(
            ['olympiad_id' => $olympiad->id, 'user_id' => $student->id],
            ['current_status' => 'registered', 'registered_at' => now()]
        );
    }
}
