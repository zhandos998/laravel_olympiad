<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Olympiad;
use App\Models\OlympiadRegistration;
use App\Models\QuestionOption;
use App\Models\StageAttempt;
use App\Models\StageAttemptAnswer;
use App\Models\StageTwoSession;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StudentExamController extends Controller
{
    private const PROFILE_SUBJECT_CODES = [
        'biology_chemistry' => ['biology', 'chemistry'],
        'chemistry_physics' => ['chemistry', 'physics'],
        'biology_geography' => ['biology', 'geography'],
        'math_physics' => ['mathematics', 'physics'],
        'math_informatics' => ['mathematics', 'informatics'],
        'math_geography' => ['mathematics', 'geography'],
        'geography_foreign_language' => ['geography', 'foreign_language'],
        'creative_creative' => ['creative'],
    ];

    public function availableOlympiads(Request $request)
    {
        return Olympiad::query()
            ->where('is_active', true)
            ->with([
                'subjects:id,olympiad_id,name,language',
                'registrations' => fn ($query) => $query->where('user_id', $request->user()->id),
            ])
            ->latest()
            ->get()
            ->map(function (Olympiad $olympiad) {
                $registration = $olympiad->registrations->first();
                $subjects = $registration
                    ? $this->filterSubjectsForRegistration($olympiad->subjects, $registration)
                    : $olympiad->subjects->values();

                return [
                    'id' => $olympiad->id,
                    'title' => $olympiad->title,
                    'description' => $olympiad->description,
                    'registration_open' => $olympiad->registration_open,
                    'subjects' => $subjects->map(fn (Subject $subject) => [
                        'id' => $subject->id,
                        'name' => $subject->name,
                        'display_name' => $subject->display_name,
                        'language' => $subject->language,
                    ])->values(),
                    'registration' => $registration ? [
                        'id' => $registration->id,
                        'current_status' => $registration->current_status,
                        'registered_at' => $registration->registered_at,
                        'test_language' => $registration->test_language,
                        'profile_subjects' => $registration->profile_subjects,
                    ] : null,
                ];
            })
            ->values();
    }

    public function showOlympiad(Request $request, Olympiad $olympiad)
    {
        $registration = $this->getRegistrationOrFail($request, $olympiad->id);

        $subjects = $this->filterSubjectsForRegistration($olympiad->subjects()->get(), $registration);
        $attempts = StageAttempt::query()
            ->where('olympiad_registration_id', $registration->id)
            ->where('stage', 1)
            ->whereIn('subject_id', $subjects->pluck('id'))
            ->get()
            ->keyBy('subject_id');

        return response()->json([
            'olympiad' => [
                'id' => $olympiad->id,
                'title' => $olympiad->title,
                'description' => $olympiad->description,
                'registration_open' => $olympiad->registration_open,
                'stage1_question_count' => $olympiad->stage1_question_count,
                'stage1_duration_minutes' => $olympiad->stage1_duration_minutes,
                'stage1_pass_percent' => $olympiad->stage1_pass_percent,
            ],
            'registration' => [
                'id' => $registration->id,
                'current_status' => $registration->current_status,
                'registered_at' => $registration->registered_at,
                'stage1_started_at' => $registration->stage1_started_at,
                'stage1_ends_at' => $registration->stage1_started_at?->copy()->addMinutes($olympiad->stage1_duration_minutes ?? 90),
                'test_language' => $registration->test_language,
                'profile_subjects' => $registration->profile_subjects,
            ],
            'subjects' => $subjects->map(function (Subject $subject) use ($attempts, $olympiad) {
                /** @var StageAttempt|null $attempt */
                $attempt = $attempts->get($subject->id);

                return [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'display_name' => $subject->display_name,
                    'language' => $subject->language,
                    'description' => $subject->description,
                    'stage1_question_count' => $subject->stage1_question_count ?: $olympiad->stage1_question_count,
                    'stage1_attempt' => $attempt ? [
                        'attempt_id' => $attempt->id,
                        'status' => $attempt->submitted_at ? 'completed' : 'in_progress',
                        'total_questions' => $attempt->total_questions,
                        'correct_answers' => $attempt->correct_answers,
                        'score_percent' => $attempt->score_percent,
                        'is_passed' => $attempt->is_passed,
                        'started_at' => $attempt->started_at,
                        'submitted_at' => $attempt->submitted_at,
                    ] : null,
                ];
            })->values(),
        ]);
    }

    public function startOlympiadStageOne(Request $request, Olympiad $olympiad)
    {
        $registration = $this->getRegistrationOrFail($request, $olympiad->id);

        if (!$registration->stage1_started_at) {
            $registration->update([
                'stage1_started_at' => now(),
            ]);
        }

        return response()->json([
            'stage1_started_at' => $registration->stage1_started_at,
            'stage1_ends_at' => $registration->stage1_started_at?->copy()->addMinutes($olympiad->stage1_duration_minutes ?? 90),
            'duration_minutes' => $olympiad->stage1_duration_minutes ?? 90,
        ]);
    }

    public function startStageOne(Request $request, Subject $subject)
    {
        $registration = $this->getRegistrationOrFail($request, $subject->olympiad_id);
        $this->ensureSubjectAvailableForRegistration($subject, $registration);

        if (!$registration->stage1_started_at) {
            throw ValidationException::withMessages([
                'stage1' => __('messages.stage1_not_started'),
            ]);
        }

        if ($registration->current_status === 'eliminated') {
            return response()->json(['message' => __('messages.eliminated_cannot_continue')], 422);
        }

        $existingAttempt = StageAttempt::where('olympiad_registration_id', $registration->id)
            ->where('subject_id', $subject->id)
            ->where('stage', 1)
            ->with('answers.question.options:id,question_id,text')
            ->first();

        if ($existingAttempt && $existingAttempt->submitted_at) {
            return response()->json(['message' => __('messages.stage1_already_submitted_for_subject')], 422);
        }

        if ($existingAttempt && $existingAttempt->answers->isNotEmpty()) {
            return response()->json($this->mapStageOneAttempt($subject, $existingAttempt, $registration));
        }

        $attempt = DB::transaction(function () use ($subject, $registration, $existingAttempt) {
            $questionCount = $subject->stage1_question_count ?: $subject->olympiad->stage1_question_count;

            $questions = $subject->questions()
                ->where('is_active', true)
                ->with('options:id,question_id,text')
                ->inRandomOrder()
                ->limit($questionCount)
                ->get();

            if ($questions->count() < $questionCount) {
                throw ValidationException::withMessages([
                    'subject' => __('messages.not_enough_questions', ['count' => $questionCount]),
                ]);
            }

            $attempt = $existingAttempt ?: StageAttempt::create([
                'olympiad_registration_id' => $registration->id,
                'subject_id' => $subject->id,
                'stage' => 1,
                'started_at' => $registration->stage1_started_at,
            ]);

            if (!$attempt->started_at) {
                $attempt->started_at = $registration->stage1_started_at;
            }

            $attempt->total_questions = $questionCount;
            $attempt->save();

            $attempt->answers()->delete();

            foreach ($questions as $question) {
                StageAttemptAnswer::create([
                    'stage_attempt_id' => $attempt->id,
                    'question_id' => $question->id,
                    'selected_option_id' => null,
                    'is_correct' => false,
                ]);
            }

            return $attempt->load(['answers.question.options:id,question_id,text']);
        });

        return response()->json($this->mapStageOneAttempt($subject, $attempt, $registration));
    }

    public function saveStageOneAnswer(Request $request, Subject $subject)
    {
        $registration = $this->getRegistrationOrFail($request, $subject->olympiad_id);
        $this->ensureSubjectAvailableForRegistration($subject, $registration);

        if (!$registration->stage1_started_at) {
            throw ValidationException::withMessages([
                'stage1' => __('messages.stage1_not_started'),
            ]);
        }

        $attempt = StageAttempt::where('olympiad_registration_id', $registration->id)
            ->where('subject_id', $subject->id)
            ->where('stage', 1)
            ->with('answers')
            ->first();

        if (!$attempt) {
            return response()->json(['message' => __('messages.stage1_not_started')], 422);
        }

        if ($attempt->submitted_at) {
            return response()->json(['message' => __('messages.stage1_already_submitted')], 422);
        }

        $data = $request->validate([
            'question_id' => ['required', 'integer'],
            'option_id' => ['nullable', 'integer'],
        ]);

        /** @var StageAttemptAnswer|null $attemptAnswer */
        $attemptAnswer = $attempt->answers->firstWhere('question_id', $data['question_id']);

        if (!$attemptAnswer) {
            throw ValidationException::withMessages([
                'question_id' => __('validation.exists', ['attribute' => 'question']),
            ]);
        }

        $optionId = $data['option_id'] ?? null;
        $isCorrect = false;

        if ($optionId) {
            $selectedOption = QuestionOption::query()
                ->where('id', $optionId)
                ->where('question_id', $attemptAnswer->question_id)
                ->first();

            if (!$selectedOption) {
                throw ValidationException::withMessages([
                    'option_id' => __('validation.exists', ['attribute' => 'option']),
                ]);
            }

            $isCorrect = (bool) $selectedOption->is_correct;
        }

        $attemptAnswer->update([
            'selected_option_id' => $optionId,
            'is_correct' => $isCorrect,
        ]);

        return response()->json([
            'saved' => true,
            'question_id' => $attemptAnswer->question_id,
            'selected_option_id' => $attemptAnswer->selected_option_id,
        ]);
    }

    public function submitStageOne(Request $request, Subject $subject)
    {
        $registration = $this->getRegistrationOrFail($request, $subject->olympiad_id);
        $this->ensureSubjectAvailableForRegistration($subject, $registration);

        if (!$registration->stage1_started_at) {
            throw ValidationException::withMessages([
                'stage1' => __('messages.stage1_not_started'),
            ]);
        }

        $attempt = StageAttempt::where('olympiad_registration_id', $registration->id)
            ->where('subject_id', $subject->id)
            ->where('stage', 1)
            ->with('answers')
            ->first();

        if (!$attempt) {
            return response()->json(['message' => __('messages.stage1_not_started')], 422);
        }

        if ($attempt->submitted_at) {
            return response()->json(['message' => __('messages.stage1_already_submitted')], 422);
        }

        $data = $request->validate([
            'answers' => ['required', 'array', 'min:1'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.option_id' => ['nullable', 'integer'],
        ]);

        $answerMap = collect($data['answers'])->keyBy('question_id');

        $result = DB::transaction(function () use ($attempt, $answerMap, $subject, $registration) {
            $correctAnswers = 0;

            foreach ($attempt->answers as $attemptAnswer) {
                $submitted = $answerMap->get($attemptAnswer->question_id);
                $optionId = $submitted['option_id'] ?? null;
                $isCorrect = false;

                if ($optionId) {
                    $isCorrect = QuestionOption::where('id', $optionId)
                        ->where('question_id', $attemptAnswer->question_id)
                        ->where('is_correct', true)
                        ->exists();
                }

                $attemptAnswer->update([
                    'selected_option_id' => $optionId,
                    'is_correct' => $isCorrect,
                ]);

                if ($isCorrect) {
                    $correctAnswers++;
                }
            }

            $total = max($attempt->total_questions, 1);
            $scorePercent = round(($correctAnswers / $total) * 100, 2);
            $passThreshold = $subject->olympiad->stage1_pass_percent;
            $isPassed = $scorePercent >= $passThreshold;

            $attempt->update([
                'correct_answers' => $correctAnswers,
                'score_percent' => $scorePercent,
                'is_passed' => $isPassed,
                'submitted_at' => now(),
            ]);

            if ($isPassed) {
                StageTwoSession::updateOrCreate(
                    [
                        'olympiad_registration_id' => $registration->id,
                        'subject_id' => $subject->id,
                    ],
                    [
                        'status' => 'scheduled',
                        'meeting_link' => $subject->stage2_link,
                    ]
                );
            }

            $this->syncRegistrationStageOneStatus($registration, $subject->olympiad);

            return [
                'correct_answers' => $correctAnswers,
                'total_questions' => $attempt->total_questions,
                'score_percent' => $scorePercent,
                'pass_threshold' => $passThreshold,
                'is_passed' => $isPassed,
            ];
        });

        return response()->json($result);
    }

    public function results(Request $request, Olympiad $olympiad)
    {
        $registration = $this->getRegistrationOrFail($request, $olympiad->id);

        $subjects = $this->filterSubjectsForRegistration($olympiad->subjects()->get(), $registration);

        $bySubject = $subjects->map(function (Subject $subject) use ($registration) {
            $stage1 = StageAttempt::where('olympiad_registration_id', $registration->id)
                ->where('subject_id', $subject->id)
                ->where('stage', 1)
                ->first();

            $stage2 = StageTwoSession::where('olympiad_registration_id', $registration->id)
                ->where('subject_id', $subject->id)
                ->first();

            $subjectScore = null;
            if ($stage1) {
                $subjectScore = (float) $stage1->score_percent;
            }
            if ($stage2 && $stage2->score_percent !== null) {
                $subjectScore = round((((float) ($stage1->score_percent ?? 0)) + ((float) $stage2->score_percent)) / 2, 2);
            }

            return [
                'subject_id' => $subject->id,
                'subject_name' => $subject->display_name,
                'subject_language' => $subject->language,
                'stage1_score_percent' => $stage1?->score_percent,
                'stage1_passed' => $stage1?->is_passed,
                'stage2_status' => $stage2?->status,
                'stage2_score_percent' => $stage2?->score_percent,
                'subject_total_score' => $subjectScore,
            ];
        })->values();

        $overallScores = $bySubject->pluck('subject_total_score')->filter(fn ($v) => $v !== null);
        $overall = $overallScores->isEmpty() ? null : round((float) $overallScores->avg(), 2);

        return response()->json([
            'registration_status' => $registration->current_status,
            'subjects' => $bySubject,
            'overall_score' => $overall,
        ]);
    }

    private function getRegistrationOrFail(Request $request, int $olympiadId): OlympiadRegistration
    {
        $registration = OlympiadRegistration::where('olympiad_id', $olympiadId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$registration) {
            throw ValidationException::withMessages([
                'registration' => __('messages.not_registered_for_olympiad'),
            ]);
        }

        return $registration;
    }

    private function mapStageOneAttempt(Subject $subject, StageAttempt $attempt, OlympiadRegistration $registration): array
    {
        $durationMinutes = $subject->olympiad->stage1_duration_minutes ?? 90;
        $startedAt = $registration->stage1_started_at ?? $attempt->started_at;

        return [
            'attempt_id' => $attempt->id,
            'subject' => $subject->name,
            'started_at' => $startedAt,
            'duration_minutes' => $durationMinutes,
            'ends_at' => $startedAt?->copy()->addMinutes($durationMinutes),
            'questions' => $attempt->answers->map(function (StageAttemptAnswer $answer) {
                return [
                    'question_id' => $answer->question->id,
                    'text' => $answer->question->text,
                    'selected_option_id' => $answer->selected_option_id,
                    'options' => $answer->question->options
                        ->map(fn ($option) => [
                            'id' => $option->id,
                            'text' => $option->text,
                        ])
                        ->shuffle()
                        ->values(),
                ];
            })->values(),
        ];
    }

    private function filterSubjectsForRegistration($subjects, OlympiadRegistration $registration)
    {
        $requiredCodes = self::PROFILE_SUBJECT_CODES[$registration->profile_subjects] ?? [];

        return $subjects
            ->filter(function (Subject $subject) use ($registration, $requiredCodes) {
                if ($subject->language && $subject->language !== $registration->test_language) {
                    return false;
                }

                if ($requiredCodes === []) {
                    return true;
                }

                $subjectCode = $this->resolveSubjectCode($subject->name);

                return $subjectCode && in_array($subjectCode, $requiredCodes, true);
            })
            ->values();
    }

    private function ensureSubjectAvailableForRegistration(Subject $subject, OlympiadRegistration $registration): void
    {
        $isAllowed = $this->filterSubjectsForRegistration(collect([$subject]), $registration)->isNotEmpty();

        if (!$isAllowed) {
            throw ValidationException::withMessages([
                'subject' => __('messages.not_registered_for_olympiad'),
            ]);
        }
    }

    private function syncRegistrationStageOneStatus(OlympiadRegistration $registration, Olympiad $olympiad): void
    {
        $subjects = $this->filterSubjectsForRegistration($olympiad->subjects()->get(), $registration);

        if ($subjects->isEmpty()) {
            $registration->update(['current_status' => 'registered']);
            return;
        }

        $attempts = StageAttempt::query()
            ->where('olympiad_registration_id', $registration->id)
            ->where('stage', 1)
            ->whereIn('subject_id', $subjects->pluck('id'))
            ->get();

        $submittedAttempts = $attempts->filter(fn (StageAttempt $attempt) => $attempt->submitted_at !== null);
        $allSubmitted = $submittedAttempts->count() === $subjects->count();

        if (!$allSubmitted) {
            $registration->update(['current_status' => 'registered']);
            return;
        }

        $passedCount = $submittedAttempts->where('is_passed', true)->count();

        $registration->update([
            'current_status' => $passedCount > 0 ? 'stage2' : 'eliminated',
        ]);
    }

    private function resolveSubjectCode(string $name): ?string
    {
        $normalized = mb_strtolower(trim(preg_replace('/\s*\([^)]*\)\s*/u', '', $name)));

        return match ($normalized) {
            'биология', 'biology' => 'biology',
            'химия', 'chemistry' => 'chemistry',
            'физика', 'physics' => 'physics',
            'география', 'geography' => 'geography',
            'математика', 'mathematics', 'math' => 'mathematics',
            'информатика', 'informatics' => 'informatics',
            'иностранный язык', 'foreign language', 'foreign_language', 'шетел тілі' => 'foreign_language',
            'творческий', 'creative', 'шығармашылық' => 'creative',
            default => null,
        };
    }
}
