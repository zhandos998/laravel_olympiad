<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $feedback = Feedback::query()
            ->with(['user:id,name,email,role', 'repliedBy:id,name,email'])
            ->when(!$user->isAdmin(), fn ($query) => $query->where('user_id', $user->id))
            ->latest()
            ->get()
            ->map(fn (Feedback $item) => $this->transform($item));

        return response()->json($feedback);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $feedback = Feedback::create([
            'user_id' => $request->user()->id,
            'message' => trim($data['message']),
        ]);

        return response()->json(
            $this->transform($feedback->load(['user:id,name,email,role', 'repliedBy:id,name,email'])),
            201
        );
    }

    public function reply(Request $request, Feedback $feedback)
    {
        $data = $request->validate([
            'admin_reply' => ['required', 'string', 'max:5000'],
        ]);

        $feedback->forceFill([
            'admin_reply' => trim($data['admin_reply']),
            'replied_by' => $request->user()->id,
            'replied_at' => now(),
        ])->save();

        return response()->json($this->transform($feedback->fresh(['user:id,name,email,role', 'repliedBy:id,name,email'])));
    }

    private function transform(Feedback $feedback): array
    {
        return [
            'id' => $feedback->id,
            'message' => $feedback->message,
            'admin_reply' => $feedback->admin_reply,
            'status' => $feedback->admin_reply ? 'answered' : 'pending',
            'created_at' => $feedback->created_at,
            'updated_at' => $feedback->updated_at,
            'replied_at' => $feedback->replied_at,
            'user' => $feedback->user ? [
                'id' => $feedback->user->id,
                'name' => $feedback->user->name,
                'email' => $feedback->user->email,
                'role' => $feedback->user->role,
            ] : null,
            'replied_by_user' => $feedback->repliedBy ? [
                'id' => $feedback->repliedBy->id,
                'name' => $feedback->repliedBy->name,
                'email' => $feedback->repliedBy->email,
            ] : null,
        ];
    }
}
