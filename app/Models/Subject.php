<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use HasFactory;

    public const LANGUAGES = ['kaz', 'rus'];

    protected $appends = ['display_name'];

    protected static function booted(): void
    {
        static::addGlobalScope('not_archived', fn (Builder $builder) => $builder->where('is_archived', false));
    }

    protected $fillable = [
        'olympiad_id',
        'name',
        'description',
        'language',
        'is_archived',
        'stage1_question_count',
        'stage2_mode',
        'stage2_link',
        'stage2_start_at',
        'stage2_end_at',
    ];

    protected function casts(): array
    {
        return [
            'is_archived' => 'boolean',
            'stage1_question_count' => 'integer',
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

    public function getDisplayNameAttribute(): string
    {
        if (!$this->language) {
            return $this->name;
        }

        $languageLabel = match ($this->language) {
            'kaz' => 'казахский',
            'rus' => 'русский',
            default => $this->language,
        };

        return "{$this->name} ({$languageLabel})";
    }
}
