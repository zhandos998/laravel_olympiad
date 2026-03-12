<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const TEST_LANGUAGES = ['kaz', 'rus'];

    public const PROFILE_SUBJECTS = [
        'biology_chemistry',
        'chemistry_physics',
        'biology_geography',
        'math_physics',
        'math_informatics',
        'math_geography',
        'geography_foreign_language',
        'creative_creative',
    ];

    protected $fillable = [
        'name',
        'email',
        'phone',
        'region',
        'city',
        'school',
        'test_language',
        'profile_subjects',
        'password',
        'role',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function registrations()
    {
        return $this->hasMany(OlympiadRegistration::class);
    }

    public function curatedSubjects()
    {
        return $this->belongsToMany(Subject::class, 'subject_curators');
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isCurator(): bool
    {
        return $this->role === 'curator';
    }

    public function isStudent(): bool
    {
        return $this->role === 'student';
    }
}
