<?php

namespace Tests\Feature;

use App\Models\Feedback;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FeedbackFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_and_curator_can_create_feedback_and_only_see_their_own_items(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $curator = User::factory()->create(['role' => 'curator']);

        Sanctum::actingAs($student);

        $studentResponse = $this->postJson('/api/feedback', [
            'message' => 'Student feedback message',
        ]);

        $studentResponse
            ->assertCreated()
            ->assertJsonPath('message', 'Student feedback message')
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('user.id', $student->id);

        Sanctum::actingAs($curator);

        $curatorResponse = $this->postJson('/api/feedback', [
            'message' => 'Curator feedback message',
        ]);

        $curatorResponse
            ->assertCreated()
            ->assertJsonPath('message', 'Curator feedback message')
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('user.id', $curator->id);

        Sanctum::actingAs($student);

        $this->getJson('/api/feedback')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.message', 'Student feedback message')
            ->assertJsonPath('0.user.id', $student->id);

        Sanctum::actingAs($curator);

        $this->getJson('/api/feedback')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.message', 'Curator feedback message')
            ->assertJsonPath('0.user.id', $curator->id);
    }

    public function test_admin_can_view_all_feedback_and_reply(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $curator = User::factory()->create(['role' => 'curator']);

        $studentFeedback = Feedback::create([
            'user_id' => $student->id,
            'message' => 'Student feedback',
        ]);

        Feedback::create([
            'user_id' => $curator->id,
            'message' => 'Curator feedback',
        ]);

        Sanctum::actingAs($admin);

        $allFeedbackResponse = $this->getJson('/api/feedback');

        $allFeedbackResponse
            ->assertOk()
            ->assertJsonCount(2);

        $messages = collect($allFeedbackResponse->json())->pluck('message')->all();
        $userIds = collect($allFeedbackResponse->json())->pluck('user.id')->all();

        $this->assertEqualsCanonicalizing(['Student feedback', 'Curator feedback'], $messages);
        $this->assertEqualsCanonicalizing([$student->id, $curator->id], $userIds);

        $replyResponse = $this->patchJson("/api/feedback/{$studentFeedback->id}/reply", [
            'admin_reply' => 'Admin response',
        ]);

        $replyResponse
            ->assertOk()
            ->assertJsonPath('id', $studentFeedback->id)
            ->assertJsonPath('admin_reply', 'Admin response')
            ->assertJsonPath('status', 'answered')
            ->assertJsonPath('replied_by_user.id', $admin->id);

        $this->assertDatabaseHas('feedback', [
            'id' => $studentFeedback->id,
            'admin_reply' => 'Admin response',
            'replied_by' => $admin->id,
        ]);

        Sanctum::actingAs($student);

        $this->getJson('/api/feedback')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $studentFeedback->id)
            ->assertJsonPath('0.admin_reply', 'Admin response')
            ->assertJsonPath('0.status', 'answered');
    }

    public function test_only_admin_can_reply_and_admin_cannot_create_feedback(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        $feedback = Feedback::create([
            'user_id' => $student->id,
            'message' => 'Need help',
        ]);

        Sanctum::actingAs($student);

        $this->patchJson("/api/feedback/{$feedback->id}/reply", [
            'admin_reply' => 'Student cannot answer',
        ])->assertForbidden();

        Sanctum::actingAs($admin);

        $this->postJson('/api/feedback', [
            'message' => 'Admin should not create feedback',
        ])->assertForbidden();
    }
}
