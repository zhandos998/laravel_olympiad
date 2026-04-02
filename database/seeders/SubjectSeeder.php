<?php

namespace Database\Seeders;

use App\Models\Olympiad;
use App\Models\Subject;
use Illuminate\Database\Seeder;

class SubjectSeeder extends Seeder
{
    private const SUBJECTS = [
        'Биология',
        'Химия',
        'Физика',
        'География',
        'Математика',
        'Информатика',
        'Иностранный язык',
        'Творческий',
    ];

    public function run(): void
    {
        $olympiad = Olympiad::where('title', 'University Spring Olympiad')->firstOrFail();

        foreach (self::SUBJECTS as $subjectName) {
            Subject::updateOrCreate(
                [
                    'olympiad_id' => $olympiad->id,
                    'name' => $subjectName,
                ],
                [
                    'stage2_mode' => 'zoom',
                    'stage2_link' => null,
                ]
            );
        }
    }
}
