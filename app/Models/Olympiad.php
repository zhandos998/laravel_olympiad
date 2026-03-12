<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Olympiad extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'registration_open',
        'is_active',
        'stage1_question_count',
        'stage1_pass_percent',
        'starts_at',
        'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'registration_open' => 'boolean',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function subjects()
    {
        return $this->hasMany(Subject::class);
    }

    public function registrations()
    {
        return $this->hasMany(OlympiadRegistration::class);
    }
}
