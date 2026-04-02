<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CuratorQuestionController extends Controller
{
    public function subjects(Request $request)
    {
        $user = $request->user();

        return Subject::query()
            ->when(!$user->isAdmin(), fn ($query) => $query->whereHas('curators', fn ($curators) => $curators->where('users.id', $user->id)))
            ->withCount('questions')
            ->with('olympiad:id,title')
            ->orderBy('name')
            ->get()
            ->map(fn (Subject $subject) => [
                'id' => $subject->id,
                'name' => $subject->name,
                'display_name' => $subject->display_name,
                'language' => $subject->language,
                'olympiad' => $subject->olympiad ? [
                    'id' => $subject->olympiad->id,
                    'title' => $subject->olympiad->title,
                ] : null,
                'questions_count' => $subject->questions_count,
            ])
            ->values();
    }

    public function index(Request $request, Subject $subject)
    {
        $this->ensureCanManageSubject($request, $subject);

        return $subject->questions()->with('options')->latest()->get();
    }

    public function show(Request $request, Subject $subject, Question $question)
    {
        $this->ensureCanManageSubject($request, $subject);

        if ($question->subject_id !== $subject->id) {
            throw ValidationException::withMessages([
                'question' => __('messages.question_does_not_belong'),
            ]);
        }

        return $question->load('options');
    }

    public function store(Request $request, Subject $subject)
    {
        $this->ensureCanManageSubject($request, $subject);

        $data = $request->validate([
            'text' => ['required', 'string'],
            'explanation' => ['nullable', 'string'],
            'options' => ['required', 'array', 'size:5'],
            'options.*.text' => ['required', 'string'],
            'options.*.is_correct' => ['required', 'boolean'],
        ]);

        $this->validateSingleCorrectOption($data['options']);

        $question = DB::transaction(function () use ($subject, $data) {
            $question = $subject->questions()->create([
                'text' => $data['text'],
                'explanation' => $data['explanation'] ?? null,
                'is_active' => true,
            ]);

            foreach ($data['options'] as $optionData) {
                $question->options()->create($optionData);
            }

            return $question->load('options');
        });

        return response()->json($question, 201);
    }

    public function update(Request $request, Subject $subject, Question $question)
    {
        $this->ensureCanManageSubject($request, $subject);

        if ($question->subject_id !== $subject->id) {
            throw ValidationException::withMessages([
                'question' => __('messages.question_does_not_belong'),
            ]);
        }

        $data = $request->validate([
            'text' => ['sometimes', 'string'],
            'explanation' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'options' => ['sometimes', 'array', 'size:5'],
            'options.*.text' => ['required_with:options', 'string'],
            'options.*.is_correct' => ['required_with:options', 'boolean'],
        ]);

        if (array_key_exists('options', $data)) {
            $this->validateSingleCorrectOption($data['options']);
        }

        $question = DB::transaction(function () use ($question, $data) {
            $question->update([
                'text' => $data['text'] ?? $question->text,
                'explanation' => array_key_exists('explanation', $data) ? $data['explanation'] : $question->explanation,
                'is_active' => $data['is_active'] ?? $question->is_active,
            ]);

            if (array_key_exists('options', $data)) {
                $question->options()->delete();

                foreach ($data['options'] as $optionData) {
                    $question->options()->create([
                        'text' => $optionData['text'],
                        'is_correct' => $optionData['is_correct'],
                    ]);
                }
            }

            return $question->load('options');
        });

        return response()->json($question);
    }

    public function destroy(Request $request, Subject $subject, Question $question)
    {
        $this->ensureCanManageSubject($request, $subject);

        if ($question->subject_id !== $subject->id) {
            throw ValidationException::withMessages([
                'question' => __('messages.question_does_not_belong'),
            ]);
        }

        $question->delete();

        return response()->json(['message' => __('messages.question_deleted')]);
    }

    private function ensureCanManageSubject(Request $request, Subject $subject): void
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            return;
        }

        $isCurator = $subject->curators()->where('users.id', $user->id)->exists();

        if (!$isCurator) {
            abort(403, __('messages.not_assigned_to_subject'));
        }
    }

    private function validateSingleCorrectOption(array $options): void
    {
        $correctCount = collect($options)->where('is_correct', true)->count();

        if ($correctCount !== 1) {
            throw ValidationException::withMessages([
                'options' => __('messages.exactly_one_correct_option'),
            ]);
        }
    }
}
