<?php

namespace Database\Seeders;

use App\Models\Subject;
use App\Models\SubjectCurator;
use App\Models\User;
use Illuminate\Database\Seeder;

class SubjectCuratorSeeder extends Seeder
{
    public function run(): void
    {
        $curator = User::where('email', 'curator@olympiad.local')->firstOrFail();

        foreach (Subject::all() as $subject) {
            SubjectCurator::updateOrCreate(
                [
                    'subject_id' => $subject->id,
                ],
                [
                    'user_id' => $curator->id,
                ]
            );
        }
    }
}
