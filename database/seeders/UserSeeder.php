<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@olympiad.local'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password123'),
                'role' => 'admin',
            ]
        );

        User::updateOrCreate(
            ['email' => 'curator@olympiad.local'],
            [
                'name' => 'Curator User',
                'password' => Hash::make('password123'),
                'role' => 'curator',
            ]
        );

        User::updateOrCreate(
            ['email' => 'student@olympiad.local'],
            [
                'name' => 'Student User',
                'password' => Hash::make('password123'),
                'role' => 'student',
                'phone' => '+77000000000',
                'region' => 'Kyzylorda',
                'city' => 'Kyzylorda',
                'school' => 'Demo School',
                'test_language' => 'kaz',
                'profile_subjects' => 'math_informatics',
            ]
        );
    }
}
