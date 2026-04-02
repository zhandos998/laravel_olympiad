<?php

namespace Database\Seeders;

use App\Models\Subject;
use Illuminate\Database\Seeder;

class QuestionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Subject::all() as $subject) {
            $existingCount = $subject->questions()->count();

            if ($existingCount >= 25) {
                continue;
            }

            for ($index = $existingCount + 1; $index <= 25; $index++) {
                $question = $subject->questions()->create([
                    'text' => "Вопрос {$index} по предмету {$subject->name}",
                    'is_active' => true,
                ]);

                for ($optionIndex = 1; $optionIndex <= 5; $optionIndex++) {
                    $question->options()->create([
                        'text' => "Вариант {$optionIndex}",
                        'is_correct' => $optionIndex === 1,
                    ]);
                }
            }
        }
    }
}
