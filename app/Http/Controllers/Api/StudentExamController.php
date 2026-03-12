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
    public function availableOlympiads()
    {
        return Olympiad::where('is_active', true)->with('subjects')->latest()->get();
    }

    public function startStageOne(Request $request, Subject $subject)
    {
        $registration = $this->getRegistrationOrFail($request, $subject->olympiad_id);

        if ($registration->current_status === 'eliminated') {
            return response()->json(['message' => 'You are eliminated and cannot continue'], 422);
        }

        $existingAttempt = StageAttempt::where('olympiad_registration_id', $registration->id)
            ->where('subject_id', $subject->id)
            ->where('stage', 1)
            ->first();

        if ($existingAttempt && $existingAttempt->submitted_at) {
            return response()->json(['message' => 'Stage 1 already submitted for this subject'], 422);
        }

        $attempt = DB::transaction(function () use ($subject, $registration, $existingAttempt) {
            $questionCount = $subject->olympiad->stage1_question_count;

            $questions = $subject->questions()
                ->where('is_active', true)
                ->with('options:id,question_id,text')
                ->inRandomOrder()
                ->limit($questionCount)
                ->get();

            if ($questions->count() < $questionCount) {
                throw ValidationException::withMessages([
                    'subject' => 'Not enough questions for this subject. Add at least '.$questionCount.' questions.',
                ]);
            }

            $attempt = $existingAttempt ?: StageAttempt::create([
                'olympiad_registration_id' => $registration->id,
                'subject_id' => $subject->id,
                'stage' => 1,
                'started_at' => now(),
            ]);

            if (!$attempt->started_at) {
                $attempt->started_at = now();
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

        return response()->json([
            'attempt_id' => $attempt->id,
            'subject' => $subject->name,
            'questions' => $attempt->answers->map(function (StageAttemptAnswer $answer) {
                return [
                    'question_id' => $answer->question->id,
                    'text' => $answer->question->text,
                    'options' => $answer->question->options->map(fn ($option) => [
                        'id' => $option->id,
                        'text' => $option->text,
                    ])->values(),
                ];
            })->values(),
        ]);
    }

    public function submitStageOne(Request $request, Subject $subject)
    {
        $registration = $this->getRegistrationOrFail($request, $subject->olympiad_id);

        $attempt = StageAttempt::where('olympiad_registration_id', $registration->id)
            ->where('subject_id', $subject->id)
            ->where('stage', 1)
            ->with('answers')
            ->first();

        if (!$attempt) {
            return response()->json(['message' => 'Stage 1 is not started'], 422);
        }

        if ($attempt->submitted_at) {
            return response()->json(['message' => 'Stage 1 already submitted'], 422);
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

            if (!$isPassed) {
                $registration->update(['current_status' => 'eliminated']);
            } else {
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

                if ($registration->current_status !== 'eliminated') {
                    $registration->update(['current_status' => 'stage2']);
                }
            }

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

        $subjects = $olympiad->subjects()->get();

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
                'subject_name' => $subject->name,
                'stage1_score_percent' => $stage1?->score_percent,
                'stage1_passed' => $stage1?->is_passed,
                'stage2_status' => $stage2?->status,
                'stage2_score_percent' => $stage2?->score_percent,
                'subject_total_score' => $subjectScore,
            ];
        })->values();

        $overall = round((float) $bySubject->pluck('subject_total_score')->filter(fn ($v) => $v !== null)->avg(), 2);

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
                'registration' => 'You are not registered for this olympiad',
            ]);
        }

        return $registration;
    }
}
