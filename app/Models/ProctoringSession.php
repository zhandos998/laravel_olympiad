<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProctoringSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'olympiad_registration_id',
        'stage',
        'status',
        'started_at',
        'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function registration()
    {
        return $this->belongsTo(OlympiadRegistration::class, 'olympiad_registration_id');
    }

    public function chunks()
    {
        return $this->hasMany(ProctoringChunk::class);
    }

    public function recordings()
    {
        return $this->hasMany(ProctoringRecording::class);
    }
}
