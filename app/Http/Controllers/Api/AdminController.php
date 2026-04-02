<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Olympiad;
use App\Models\OlympiadRegistration;
use App\Models\StageTwoSession;
use App\Models\Subject;
use App\Models\SubjectCurator;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function olympiads()
    {
        return Olympiad::query()
            ->withCount('registrations')
            ->with([
                'subjects' => fn ($query) => $query
                    ->withCount('questions')
                    ->with(['curators:id,name,email']),
            ])
            ->latest()
            ->get();
    }

    public function showOlympiad(Olympiad $olympiad)
    {
        return response()->json($this->buildOlympiadDashboard($olympiad));
    }

    public function createOlympiad(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'registration_open' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'stage1_question_count' => ['nullable', 'integer', 'min:1', 'max:100'],
            'stage1_duration_minutes' => ['nullable', 'integer', 'min:1', 'max:300'],
            'stage1_pass_percent' => ['nullable', 'integer', 'min:1', 'max:100'],
            'stage1_starts_at' => ['nullable', 'date'],
            'stage1_ends_at' => ['nullable', 'date', 'after_or_equal:stage1_starts_at'],
            'stage2_starts_at' => ['nullable', 'date'],
            'stage2_ends_at' => ['nullable', 'date', 'after_or_equal:stage2_starts_at'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);

        $olympiad = Olympiad::create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'registration_open' => $data['registration_open'] ?? true,
            'is_active' => $data['is_active'] ?? true,
            'stage1_question_count' => $data['stage1_question_count'] ?? 25,
            'stage1_duration_minutes' => $data['stage1_duration_minutes'] ?? 90,
            'stage1_pass_percent' => $data['stage1_pass_percent'] ?? 70,
            'stage1_starts_at' => $data['stage1_starts_at'] ?? $data['starts_at'] ?? null,
            'stage1_ends_at' => $data['stage1_ends_at'] ?? $data['ends_at'] ?? null,
            'stage2_starts_at' => $data['stage2_starts_at'] ?? null,
            'stage2_ends_at' => $data['stage2_ends_at'] ?? null,
            'starts_at' => $data['stage1_starts_at'] ?? $data['starts_at'] ?? null,
            'ends_at' => $data['stage1_ends_at'] ?? $data['ends_at'] ?? null,
        ]);

        return response()->json($olympiad, 201);
    }

    public function updateOlympiad(Request $request, Olympiad $olympiad)
    {
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'registration_open' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'stage1_question_count' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'stage1_duration_minutes' => ['sometimes', 'integer', 'min:1', 'max:300'],
            'stage1_pass_percent' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'stage1_starts_at' => ['nullable', 'date'],
            'stage1_ends_at' => ['nullable', 'date', 'after_or_equal:stage1_starts_at'],
            'stage2_starts_at' => ['nullable', 'date'],
            'stage2_ends_at' => ['nullable', 'date', 'after_or_equal:stage2_starts_at'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);

        if (array_key_exists('stage1_starts_at', $data)) {
            $data['starts_at'] = $data['stage1_starts_at'];
        }

        if (array_key_exists('stage1_ends_at', $data)) {
            $data['ends_at'] = $data['stage1_ends_at'];
        }

        $olympiad->update($data);

        return response()->json($this->buildOlympiadDashboard($olympiad->fresh()));
    }

    public function toggleRegistration(Request $request, Olympiad $olympiad)
    {
        $data = $request->validate([
            'registration_open' => ['required', 'boolean'],
        ]);

        $olympiad->update(['registration_open' => $data['registration_open']]);

        return response()->json($olympiad);
    }

    public function archiveOlympiad(Olympiad $olympiad)
    {
        $olympiad->update(['is_archived' => true]);
        $olympiad->subjects()->update(['is_archived' => true]);

        return response()->json(['archived' => true]);
    }

    public function createSubject(Request $request, Olympiad $olympiad)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'language' => ['nullable', Rule::in(Subject::LANGUAGES)],
            'stage1_question_count' => ['nullable', 'integer', 'min:1', 'max:100'],
            'stage2_mode' => ['nullable', 'string', 'max:50'],
            'stage2_link' => ['nullable', 'url'],
            'stage2_start_at' => ['nullable', 'date'],
            'stage2_end_at' => ['nullable', 'date', 'after_or_equal:stage2_start_at'],
        ]);

        $data['stage1_question_count'] = $data['stage1_question_count'] ?? $olympiad->stage1_question_count;

        $subject = $olympiad->subjects()->create($data);

        return response()->json($subject, 201);
    }

    public function updateSubject(Request $request, Subject $subject)
    {
        $data = $request->validate([
            'stage1_question_count' => ['required', 'integer', 'min:1', 'max:100'],
            'language' => ['nullable', Rule::in(Subject::LANGUAGES)],
            'user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
        ]);

        $subject->update([
            'stage1_question_count' => $data['stage1_question_count'],
            'language' => $data['language'] ?? null,
        ]);

        SubjectCurator::where('subject_id', $subject->id)->delete();

        if (!empty($data['user_id'])) {
            $user = User::findOrFail($data['user_id']);

            if (!$user->isCurator() && !$user->isAdmin()) {
                return response()->json(['message' => __('messages.user_must_be_curator_or_admin')], 422);
            }

            SubjectCurator::create([
                'subject_id' => $subject->id,
                'user_id' => $user->id,
            ]);
        }

        return response()->json($subject->fresh(['curators:id,name,email'])->loadCount('questions'));
    }

    public function archiveSubject(Subject $subject)
    {
        $subject->update(['is_archived' => true]);

        return response()->json(['archived' => true]);
    }

    public function assignCurator(Request $request, Subject $subject)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')],
        ]);

        $user = User::findOrFail($data['user_id']);

        if (!$user->isCurator() && !$user->isAdmin()) {
            return response()->json(['message' => __('messages.user_must_be_curator_or_admin')], 422);
        }

        SubjectCurator::where('subject_id', $subject->id)->delete();

        $pivot = SubjectCurator::create([
            'subject_id' => $subject->id,
            'user_id' => $user->id,
        ]);

        return response()->json($subject->load('curators:id,name,email'), 201);
    }

    public function users(Request $request)
    {
        $role = $request->query('role');

        return User::query()
            ->when($role, fn ($q) => $q->where('role', $role))
            ->latest()
            ->get();
    }

    public function updateStageTwoResult(Request $request, Subject $subject)
    {
        $data = $request->validate([
            'olympiad_registration_id' => ['required', 'integer', Rule::exists('olympiad_registrations', 'id')],
            'status' => ['required', 'in:scheduled,completed,absent'],
            'meeting_link' => ['nullable', 'url'],
            'score_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'started_at' => ['nullable', 'date'],
            'ended_at' => ['nullable', 'date', 'after_or_equal:started_at'],
        ]);

        $session = StageTwoSession::updateOrCreate(
            [
                'olympiad_registration_id' => $data['olympiad_registration_id'],
                'subject_id' => $subject->id,
            ],
            [
                'status' => $data['status'],
                'meeting_link' => $data['meeting_link'] ?? $subject->stage2_link,
                'score_percent' => $data['score_percent'] ?? null,
                'started_at' => $data['started_at'] ?? null,
                'ended_at' => $data['ended_at'] ?? null,
            ]
        );

        $registration = OlympiadRegistration::with([
            'attempts' => fn ($query) => $query->where('stage', 1),
            'stageTwoSessions',
        ])->findOrFail($data['olympiad_registration_id']);

        $passedSubjectIds = $registration->attempts
            ->where('is_passed', true)
            ->pluck('subject_id');

        if ($passedSubjectIds->isNotEmpty()) {
            $resolvedCount = $registration->stageTwoSessions
                ->whereIn('subject_id', $passedSubjectIds)
                ->whereIn('status', ['completed', 'absent'])
                ->count();

            $registration->update([
                'current_status' => $resolvedCount === $passedSubjectIds->count() ? 'completed' : 'stage2',
            ]);
        }

        return response()->json($session);
    }

    private function buildOlympiadDashboard(Olympiad $olympiad): array
    {
        $olympiad->loadCount('registrations');

        $subjects = $olympiad->subjects()
            ->withCount('questions')
            ->with(['curators:id,name,email'])
            ->orderBy('name')
            ->get();

        $participants = OlympiadRegistration::query()
            ->where('olympiad_id', $olympiad->id)
            ->with([
                'user:id,name,email,phone,region,city,school,test_language,profile_subjects',
                'attempts' => fn ($query) => $query
                    ->where('stage', 1)
                    ->select([
                        'id',
                        'olympiad_registration_id',
                        'subject_id',
                        'stage',
                        'total_questions',
                        'correct_answers',
                        'score_percent',
                        'is_passed',
                        'started_at',
                        'submitted_at',
                    ]),
                'stageTwoSessions' => fn ($query) => $query->select([
                    'id',
                    'olympiad_registration_id',
                    'subject_id',
                    'status',
                    'meeting_link',
                    'score_percent',
                    'started_at',
                    'ended_at',
                ]),
                'proctoringSessions:id,olympiad_registration_id,status,started_at,finished_at',
            ])
            ->latest()
            ->get()
            ->map(fn (OlympiadRegistration $registration) => $this->transformRegistration($registration, $subjects))
            ->values();

        $subjectPayload = $subjects->map(function (Subject $subject) {
            $hasCurator = $subject->curators->isNotEmpty();
            $hasEnoughQuestions = $subject->questions_count >= $subject->stage1_question_count;
            $readinessReasons = [];

            if (!$hasCurator) {
                $readinessReasons[] = 'missing_curator';
            }

            if (!$hasEnoughQuestions) {
                $readinessReasons[] = 'missing_questions';
            }

            return [
                'id' => $subject->id,
                'name' => $subject->name,
                'display_name' => $subject->display_name,
                'language' => $subject->language,
                'stage1_question_count' => $subject->stage1_question_count,
                'questions_count' => $subject->questions_count,
                'question_gap' => max($subject->stage1_question_count - $subject->questions_count, 0),
                'assigned_curator' => $subject->curators->first() ? [
                    'id' => $subject->curators->first()->id,
                    'name' => $subject->curators->first()->name,
                    'email' => $subject->curators->first()->email,
                ] : null,
                'curators' => $subject->curators->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ])->values(),
                'is_ready' => $hasCurator && $hasEnoughQuestions,
                'readiness_reasons' => $readinessReasons,
                'stage2_mode' => $subject->stage2_mode,
                'stage2_link' => $subject->stage2_link,
                'stage2_start_at' => $subject->stage2_start_at,
                'stage2_end_at' => $subject->stage2_end_at,
            ];
        })->values();

        return [
            'olympiad' => [
                'id' => $olympiad->id,
                'title' => $olympiad->title,
                'description' => $olympiad->description,
                'registration_open' => $olympiad->registration_open,
                'is_active' => $olympiad->is_active,
                'stage1_question_count' => $olympiad->stage1_question_count,
                'stage1_duration_minutes' => $olympiad->stage1_duration_minutes,
                'stage1_pass_percent' => $olympiad->stage1_pass_percent,
                'stage1_starts_at' => $olympiad->stage1_starts_at,
                'stage1_ends_at' => $olympiad->stage1_ends_at,
                'stage2_starts_at' => $olympiad->stage2_starts_at,
                'stage2_ends_at' => $olympiad->stage2_ends_at,
                'starts_at' => $olympiad->starts_at,
                'ends_at' => $olympiad->ends_at,
                'registrations_count' => $olympiad->registrations_count,
            ],
            'subjects' => $subjectPayload,
            'participants' => $participants,
            'summary' => [
                'participants_total' => $participants->count(),
                'subjects_total' => $subjectPayload->count(),
                'ready_subjects_total' => $subjectPayload->where('is_ready', true)->count(),
                'eliminated_total' => $participants->where('current_status', 'eliminated')->count(),
                'stage2_total' => $participants->filter(fn (array $participant) => $participant['passed_stage1_count'] > 0)->count(),
                'completed_total' => $participants->filter(fn (array $participant) => $participant['completed_stage2_count'] > 0)->count(),
            ],
        ];
    }

    private function transformRegistration(OlympiadRegistration $registration, $subjects): array
    {
        $attemptsBySubject = $registration->attempts->keyBy('subject_id');
        $sessionsBySubject = $registration->stageTwoSessions->keyBy('subject_id');

        $subjectResults = $subjects->map(function (Subject $subject) use ($attemptsBySubject, $sessionsBySubject) {
            $stage1 = $attemptsBySubject->get($subject->id);
            $stage2 = $sessionsBySubject->get($subject->id);

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
                'stage1_submitted_at' => $stage1?->submitted_at,
                'stage2_session_id' => $stage2?->id,
                'stage2_status' => $stage2?->status,
                'stage2_meeting_link' => $stage2?->meeting_link ?: $subject->stage2_link,
                'stage2_score_percent' => $stage2?->score_percent,
                'stage2_started_at' => $stage2?->started_at,
                'stage2_ended_at' => $stage2?->ended_at,
                'subject_total_score' => $subjectScore,
            ];
        })->values();

        $overallScores = $subjectResults->pluck('subject_total_score')->filter(fn ($value) => $value !== null);
        $overallScore = $overallScores->isEmpty() ? null : round((float) $overallScores->avg(), 2);

        return [
            'registration_id' => $registration->id,
            'current_status' => $registration->current_status,
            'registered_at' => $registration->registered_at,
            'user' => [
                'id' => $registration->user->id,
                'name' => $registration->user->name,
                'email' => $registration->user->email,
                'phone' => $registration->user->phone,
                'region' => $registration->user->region,
                'city' => $registration->user->city,
                'school' => $registration->user->school,
                'test_language' => $registration->user->test_language,
                'profile_subjects' => $registration->user->profile_subjects,
            ],
            'passed_stage1_count' => $subjectResults->where('stage1_passed', true)->count(),
            'failed_stage1_count' => $subjectResults->filter(
                fn (array $result) => $result['stage1_submitted_at'] && $result['stage1_passed'] === false
            )->count(),
            'completed_stage2_count' => $subjectResults->where('stage2_status', 'completed')->count(),
            'overall_score' => $overallScore,
            'proctoring_sessions_count' => $registration->proctoringSessions->count(),
            'has_proctoring' => $registration->proctoringSessions->isNotEmpty(),
            'subject_results' => $subjectResults,
        ];
    }
}
