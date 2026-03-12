<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Olympiad;
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
        return Olympiad::with('subjects')->latest()->get();
    }

    public function createOlympiad(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'registration_open' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'stage1_question_count' => ['nullable', 'integer', 'min:1', 'max:100'],
            'stage1_pass_percent' => ['nullable', 'integer', 'min:1', 'max:100'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);

        $olympiad = Olympiad::create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'registration_open' => $data['registration_open'] ?? true,
            'is_active' => $data['is_active'] ?? true,
            'stage1_question_count' => $data['stage1_question_count'] ?? 25,
            'stage1_pass_percent' => $data['stage1_pass_percent'] ?? 70,
            'starts_at' => $data['starts_at'] ?? null,
            'ends_at' => $data['ends_at'] ?? null,
        ]);

        return response()->json($olympiad, 201);
    }

    public function toggleRegistration(Request $request, Olympiad $olympiad)
    {
        $data = $request->validate([
            'registration_open' => ['required', 'boolean'],
        ]);

        $olympiad->update(['registration_open' => $data['registration_open']]);

        return response()->json($olympiad);
    }

    public function createSubject(Request $request, Olympiad $olympiad)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'stage2_mode' => ['nullable', 'string', 'max:50'],
            'stage2_link' => ['nullable', 'url'],
            'stage2_start_at' => ['nullable', 'date'],
            'stage2_end_at' => ['nullable', 'date', 'after_or_equal:stage2_start_at'],
        ]);

        $subject = $olympiad->subjects()->create($data);

        return response()->json($subject, 201);
    }

    public function assignCurator(Request $request, Subject $subject)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')],
        ]);

        $user = User::findOrFail($data['user_id']);

        if (!$user->isCurator() && !$user->isAdmin()) {
            return response()->json(['message' => 'User must have curator or admin role'], 422);
        }

        $pivot = SubjectCurator::firstOrCreate([
            'subject_id' => $subject->id,
            'user_id' => $user->id,
        ]);

        return response()->json($pivot, $pivot->wasRecentlyCreated ? 201 : 200);
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

        return response()->json($session);
    }
}
