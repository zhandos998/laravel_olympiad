<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use HasFactory;

    protected $fillable = [
        'olympiad_id',
        'name',
        'description',
        'stage2_mode',
        'stage2_link',
        'stage2_start_at',
        'stage2_end_at',
    ];

    protected function casts(): array
    {
        return [
            'stage2_start_at' => 'datetime',
            'stage2_end_at' => 'datetime',
        ];
    }

    public function olympiad()
    {
        return $this->belongsTo(Olympiad::class);
    }

    public function questions()
    {
        return $this->hasMany(Question::class);
    }

    public function curators()
    {
        return $this->belongsToMany(User::class, 'subject_curators');
    }
}
