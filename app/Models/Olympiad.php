<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Olympiad extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::addGlobalScope('not_archived', fn (Builder $builder) => $builder->where('is_archived', false));
    }

    protected $fillable = [
        'title',
        'description',
        'registration_open',
        'is_active',
        'is_archived',
        'stage1_question_count',
        'stage1_duration_minutes',
        'stage1_pass_percent',
        'stage1_starts_at',
        'stage1_ends_at',
        'stage2_starts_at',
        'stage2_ends_at',
        'starts_at',
        'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'registration_open' => 'boolean',
            'is_active' => 'boolean',
            'is_archived' => 'boolean',
            'stage1_duration_minutes' => 'integer',
            'stage1_starts_at' => 'datetime',
            'stage1_ends_at' => 'datetime',
            'stage2_starts_at' => 'datetime',
            'stage2_ends_at' => 'datetime',
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
