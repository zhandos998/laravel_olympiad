<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StageAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'olympiad_registration_id',
        'subject_id',
        'stage',
        'total_questions',
        'correct_answers',
        'score_percent',
        'is_passed',
        'started_at',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'is_passed' => 'boolean',
            'started_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    public function registration()
    {
        return $this->belongsTo(OlympiadRegistration::class, 'olympiad_registration_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function answers()
    {
        return $this->hasMany(StageAttemptAnswer::class);
    }
}
