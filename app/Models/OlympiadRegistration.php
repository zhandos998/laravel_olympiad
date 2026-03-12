<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OlympiadRegistration extends Model
{
    use HasFactory;

    protected $fillable = [
        'olympiad_id',
        'user_id',
        'current_status',
        'registered_at',
    ];

    protected function casts(): array
    {
        return [
            'registered_at' => 'datetime',
        ];
    }

    public function olympiad()
    {
        return $this->belongsTo(Olympiad::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function attempts()
    {
        return $this->hasMany(StageAttempt::class);
    }

    public function stageTwoSessions()
    {
        return $this->hasMany(StageTwoSession::class);
    }
}
