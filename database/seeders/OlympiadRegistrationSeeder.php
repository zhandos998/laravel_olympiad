<?php

namespace Database\Seeders;

use App\Models\Olympiad;
use App\Models\OlympiadRegistration;
use App\Models\User;
use Illuminate\Database\Seeder;

class OlympiadRegistrationSeeder extends Seeder
{
    public function run(): void
    {
        $olympiad = Olympiad::where('title', 'University Spring Olympiad')->firstOrFail();
        $student = User::where('email', 'student@olympiad.local')->firstOrFail();

        OlympiadRegistration::firstOrCreate(
            [
                'olympiad_id' => $olympiad->id,
                'user_id' => $student->id,
            ],
            [
                'current_status' => 'registered',
                'registered_at' => now(),
            ]
        );
    }
}
