<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProctoringChunk extends Model
{
    use HasFactory;

    protected $fillable = [
        'proctoring_session_id',
        'kind',
        'sequence',
        'disk',
        'path',
        'mime_type',
        'size_bytes',
    ];

    public function session()
    {
        return $this->belongsTo(ProctoringSession::class, 'proctoring_session_id');
    }
}
