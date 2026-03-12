<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StageTwoSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'olympiad_registration_id',
        'subject_id',
        'status',
        'meeting_link',
        'score_percent',
        'started_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
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
}
