<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProctoringSession extends Model
{
    use HasFactory;

    public const ASSEMBLY_PENDING = 'pending';
    public const ASSEMBLY_QUEUED = 'queued';
    public const ASSEMBLY_PROCESSING = 'processing';
    public const ASSEMBLY_READY = 'ready';
    public const ASSEMBLY_FAILED = 'failed';
    public const ASSEMBLY_EMPTY = 'empty';

    protected $fillable = [
        'olympiad_registration_id',
        'stage',
        'status',
        'assembly_status',
        'assembly_error',
        'started_at',
        'finished_at',
        'assembly_requested_at',
        'assembly_completed_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'assembly_requested_at' => 'datetime',
            'assembly_completed_at' => 'datetime',
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
