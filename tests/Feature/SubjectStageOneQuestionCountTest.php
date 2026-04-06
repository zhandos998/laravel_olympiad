<?php

namespace Tests\Feature;

use App\Jobs\AssembleProctoringRecording;
use App\Models\Olympiad;
use App\Models\OlympiadRegistration;
use App\Models\ProctoringChunk;
use App\Models\ProctoringRecording;
use App\Models\ProctoringSession;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\StageAttempt;
use App\Models\StageTwoSession;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubjectStageOneQuestionCountTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_subject_with_custom_stage_one_question_count(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $olympiad = Olympiad::create([
            'title' => 'Test Olympiad',
            'stage1_question_count' => 25,
            'stage1_pass_percent' => 70,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/olympiads/{$olympiad->id}/subjects", [
            'name' => 'Physics',
            'language' => 'rus',
            'stage1_question_count' => 50,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('name', 'Physics')
            ->assertJsonPath('language', 'rus')
            ->assertJsonPath('display_name', 'Physics (русский)')
            ->assertJsonPath('stage1_question_count', 50);

        $this->assertDatabaseHas('subjects', [
            'olympiad_id' => $olympiad->id,
            'name' => 'Physics',
            'language' => 'rus',
            'stage1_question_count' => 50,
        ]);
    }

    public function test_student_stage_one_uses_subject_specific_question_count(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $olympiad = Olympiad::create([
            'title' => 'Test Olympiad',
            'registration_open' => true,
            'is_active' => true,
            'stage1_question_count' => 25,
            'stage1_pass_percent' => 70,
        ]);
        $subject = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Informatics',
            'stage1_question_count' => 50,
        ]);

        OlympiadRegistration::create([
            'olympiad_id' => $olympiad->id,
            'user_id' => $student->id,
            'current_status' => 'registered',
            'stage1_started_at' => now(),
            'registered_at' => now(),
        ]);

        foreach (range(1, 50) as $index) {
            $question = Question::create([
                'subject_id' => $subject->id,
                'text' => "Question {$index}",
                'is_active' => true,
            ]);

            foreach (range(1, 5) as $optionIndex) {
                QuestionOption::create([
                    'question_id' => $question->id,
                    'text' => "Option {$optionIndex}",
                    'is_correct' => $optionIndex === 1,
                ]);
            }
        }

        Sanctum::actingAs($student);

        $response = $this->postJson("/api/student/subjects/{$subject->id}/stage-one/start");

        $response
            ->assertOk()
            ->assertJsonCount(50, 'questions');

        $attempt = StageAttempt::first();

        $this->assertNotNull($attempt);
        $this->assertSame(50, $attempt->total_questions);
        $this->assertCount(50, $attempt->answers);

        $resumeResponse = $this->postJson("/api/student/subjects/{$subject->id}/stage-one/start");

        $resumeResponse
            ->assertOk()
            ->assertJsonPath('attempt_id', $attempt->id)
            ->assertJsonCount(50, 'questions');

        $this->assertSame(1, StageAttempt::query()->count());
    }

    public function test_student_answer_is_saved_and_restored_after_page_reload(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $olympiad = Olympiad::create([
            'title' => 'Autosave Olympiad',
            'registration_open' => true,
            'is_active' => true,
            'stage1_question_count' => 1,
            'stage1_pass_percent' => 70,
        ]);
        $subject = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Informatics',
            'stage1_question_count' => 1,
        ]);

        OlympiadRegistration::create([
            'olympiad_id' => $olympiad->id,
            'user_id' => $student->id,
            'current_status' => 'registered',
            'stage1_started_at' => now(),
            'registered_at' => now(),
        ]);

        $question = Question::create([
            'subject_id' => $subject->id,
            'text' => 'Question 1',
            'is_active' => true,
        ]);

        $correctOption = QuestionOption::create([
            'question_id' => $question->id,
            'text' => 'Correct option',
            'is_correct' => true,
        ]);

        QuestionOption::create([
            'question_id' => $question->id,
            'text' => 'Wrong option',
            'is_correct' => false,
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/student/subjects/{$subject->id}/stage-one/start")
            ->assertOk()
            ->assertJsonCount(1, 'questions');

        $this->patchJson("/api/student/subjects/{$subject->id}/stage-one/answer", [
            'question_id' => $question->id,
            'option_id' => $correctOption->id,
        ])
            ->assertOk()
            ->assertJsonPath('saved', true)
            ->assertJsonPath('question_id', $question->id)
            ->assertJsonPath('selected_option_id', $correctOption->id);

        $this->assertDatabaseHas('stage_attempt_answers', [
            'question_id' => $question->id,
            'selected_option_id' => $correctOption->id,
            'is_correct' => true,
        ]);

        $this->postJson("/api/student/subjects/{$subject->id}/stage-one/start")
            ->assertOk()
            ->assertJsonPath('questions.0.question_id', $question->id)
            ->assertJsonPath('questions.0.selected_option_id', $correctOption->id);
    }

    public function test_student_enrollment_requires_and_stores_language_and_profile_subjects(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'test_language' => 'kaz',
            'profile_subjects' => 'biology_chemistry',
        ]);
        $olympiad = Olympiad::create([
            'title' => 'Enrollment Olympiad',
            'registration_open' => true,
            'is_active' => true,
            'stage1_question_count' => 25,
            'stage1_pass_percent' => 70,
        ]);

        Sanctum::actingAs($student);

        $this->postJson('/api/auth/enroll', [
            'olympiad_id' => $olympiad->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['test_language', 'profile_subjects']);

        $response = $this->postJson('/api/auth/enroll', [
            'olympiad_id' => $olympiad->id,
            'test_language' => 'rus',
            'profile_subjects' => 'math_informatics',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('current_status', 'registered')
            ->assertJsonPath('test_language', 'rus')
            ->assertJsonPath('profile_subjects', 'math_informatics');

        $this->assertDatabaseHas('olympiad_registrations', [
            'olympiad_id' => $olympiad->id,
            'user_id' => $student->id,
            'current_status' => 'registered',
            'test_language' => 'rus',
            'profile_subjects' => 'math_informatics',
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $student->id,
            'test_language' => 'rus',
            'profile_subjects' => 'math_informatics',
        ]);
    }

    public function test_student_can_start_stage_one_for_the_whole_olympiad(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'test_language' => 'kaz',
            'profile_subjects' => 'math_informatics',
        ]);
        $olympiad = Olympiad::create([
            'title' => 'Timed Olympiad',
            'registration_open' => true,
            'is_active' => true,
            'stage1_question_count' => 25,
            'stage1_duration_minutes' => 90,
            'stage1_pass_percent' => 70,
        ]);
        OlympiadRegistration::create([
            'olympiad_id' => $olympiad->id,
            'user_id' => $student->id,
            'current_status' => 'registered',
            'test_language' => 'kaz',
            'profile_subjects' => 'math_informatics',
            'registered_at' => now(),
        ]);

        Sanctum::actingAs($student);

        $response = $this->postJson("/api/student/olympiads/{$olympiad->id}/stage-one/start");

        $response
            ->assertOk()
            ->assertJsonPath('duration_minutes', 90);

        $this->assertDatabaseHas('olympiad_registrations', [
            'olympiad_id' => $olympiad->id,
            'user_id' => $student->id,
        ]);

        $this->assertNotNull(
            OlympiadRegistration::query()
                ->where('olympiad_id', $olympiad->id)
                ->where('user_id', $student->id)
                ->value('stage1_started_at')
        );
    }

    public function test_student_can_start_upload_and_finish_proctoring_session(): void
    {
        Storage::fake('local');
        Queue::fake();

        $student = User::factory()->create([
            'role' => 'student',
            'test_language' => 'kaz',
            'profile_subjects' => 'math_informatics',
        ]);
        $olympiad = Olympiad::create([
            'title' => 'Proctoring Olympiad',
            'registration_open' => true,
            'is_active' => true,
            'stage1_question_count' => 25,
            'stage1_duration_minutes' => 90,
            'stage1_pass_percent' => 70,
        ]);
        $registration = OlympiadRegistration::create([
            'olympiad_id' => $olympiad->id,
            'user_id' => $student->id,
            'current_status' => 'registered',
            'test_language' => 'kaz',
            'profile_subjects' => 'math_informatics',
            'registered_at' => now(),
            'stage1_started_at' => now(),
        ]);

        Sanctum::actingAs($student);

        $startResponse = $this->postJson("/api/student/olympiads/{$olympiad->id}/proctoring/start");

        $startResponse
            ->assertOk()
            ->assertJsonPath('status', 'active')
            ->assertJsonPath('uploaded_counts.combined', 0);

        $sessionId = $startResponse->json('session_id');

        $this->assertDatabaseHas('proctoring_sessions', [
            'id' => $sessionId,
            'olympiad_registration_id' => $registration->id,
            'stage' => 1,
            'status' => 'active',
        ]);

        $uploadResponse = $this->post("/api/student/proctoring-sessions/{$sessionId}/chunks", [
            'kind' => 'combined',
            'sequence' => 0,
            'chunk' => UploadedFile::fake()->create('combined-000000.webm', 64, 'video/webm'),
        ]);

        $uploadResponse
            ->assertOk()
            ->assertJsonPath('saved', true)
            ->assertJsonPath('kind', 'combined')
            ->assertJsonPath('sequence', 0);

        $this->assertDatabaseHas('proctoring_chunks', [
            'proctoring_session_id' => $sessionId,
            'kind' => 'combined',
            'sequence' => 0,
        ]);

        $chunkPath = \App\Models\ProctoringChunk::query()
            ->where('proctoring_session_id', $sessionId)
            ->where('kind', 'combined')
            ->value('path');

        Storage::disk('local')->assertExists($chunkPath);

        $this->postJson("/api/student/proctoring-sessions/{$sessionId}/finish")
            ->assertOk()
            ->assertJsonPath('status', 'finished')
            ->assertJsonPath('assembly_status', 'queued')
            ->assertJsonPath('combined_chunks_count', 1)
            ->assertJsonPath('combined_recording_available', false);

        Queue::assertPushed(AssembleProctoringRecording::class, function (AssembleProctoringRecording $job) use ($sessionId) {
            return $job->sessionId === $sessionId;
        });

        $this->assertDatabaseHas('proctoring_sessions', [
            'id' => $sessionId,
            'status' => 'finished',
            'assembly_status' => 'queued',
        ]);
        $this->assertDatabaseMissing('proctoring_recordings', [
            'proctoring_session_id' => $sessionId,
            'kind' => 'combined',
        ]);
    }

    public function test_student_is_not_eliminated_until_all_stage_one_subjects_are_completed(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'test_language' => 'kaz',
            'profile_subjects' => 'math_informatics',
        ]);
        $olympiad = Olympiad::create([
            'title' => 'Combined Stage One Olympiad',
            'registration_open' => true,
            'is_active' => true,
            'stage1_question_count' => 2,
            'stage1_duration_minutes' => 90,
            'stage1_pass_percent' => 70,
        ]);
        $math = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Mathematics',
            'language' => 'kaz',
            'stage1_question_count' => 2,
        ]);
        $informatics = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Informatics',
            'language' => 'kaz',
            'stage1_question_count' => 2,
        ]);

        foreach ([$math, $informatics] as $subject) {
            foreach (range(1, 2) as $index) {
                $question = Question::create([
                    'subject_id' => $subject->id,
                    'text' => "{$subject->name} Question {$index}",
                    'is_active' => true,
                ]);

                foreach (range(1, 5) as $optionIndex) {
                    QuestionOption::create([
                        'question_id' => $question->id,
                        'text' => "Option {$optionIndex}",
                        'is_correct' => $optionIndex === 1,
                    ]);
                }
            }
        }

        $registration = OlympiadRegistration::create([
            'olympiad_id' => $olympiad->id,
            'user_id' => $student->id,
            'current_status' => 'registered',
            'test_language' => 'kaz',
            'profile_subjects' => 'math_informatics',
            'registered_at' => now(),
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/student/olympiads/{$olympiad->id}/stage-one/start")
            ->assertOk();

        $mathAttempt = $this->postJson("/api/student/subjects/{$math->id}/stage-one/start")
            ->assertOk()
            ->json();

        $this->postJson("/api/student/subjects/{$math->id}/stage-one/submit", [
            'answers' => collect($mathAttempt['questions'])->map(fn(array $question) => [
                'question_id' => $question['question_id'],
                'option_id' => QuestionOption::query()
                    ->where('question_id', $question['question_id'])
                    ->where('is_correct', false)
                    ->value('id'),
            ])->values()->all(),
        ])->assertOk()->assertJsonPath('is_passed', false);

        $this->assertDatabaseHas('olympiad_registrations', [
            'id' => $registration->id,
            'current_status' => 'registered',
        ]);

        $this->postJson("/api/student/subjects/{$informatics->id}/stage-one/start")
            ->assertOk();
    }

    public function test_student_available_olympiads_include_current_registration_details(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'test_language' => 'kaz',
            'profile_subjects' => 'biology_chemistry',
        ]);
        $olympiad = Olympiad::create([
            'title' => 'Visible Olympiad',
            'registration_open' => true,
            'is_active' => true,
            'stage1_question_count' => 25,
            'stage1_pass_percent' => 70,
        ]);
        $subject = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Mathematics',
            'language' => 'rus',
            'stage1_question_count' => 25,
        ]);
        OlympiadRegistration::create([
            'olympiad_id' => $olympiad->id,
            'user_id' => $student->id,
            'current_status' => 'registered',
            'test_language' => 'rus',
            'profile_subjects' => 'math_informatics',
            'registered_at' => now(),
        ]);

        Sanctum::actingAs($student);

        $this->getJson('/api/student/olympiads')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $olympiad->id)
            ->assertJsonPath('0.subjects.0.id', $subject->id)
            ->assertJsonPath('0.subjects.0.name', 'Mathematics')
            ->assertJsonPath('0.subjects.0.language', 'rus')
            ->assertJsonPath('0.registration.current_status', 'registered')
            ->assertJsonPath('0.registration.test_language', 'rus')
            ->assertJsonPath('0.registration.profile_subjects', 'math_informatics');
    }

    public function test_student_can_open_registered_olympiad_page_with_subject_attempt_statuses(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'test_language' => 'kaz',
            'profile_subjects' => 'math_informatics',
        ]);
        $olympiad = Olympiad::create([
            'title' => 'Student Olympiad',
            'registration_open' => true,
            'is_active' => true,
            'stage1_question_count' => 25,
            'stage1_duration_minutes' => 90,
            'stage1_pass_percent' => 70,
            'stage2_starts_at' => '2026-03-13 10:00:00',
            'stage2_ends_at' => '2026-03-13 12:00:00',
        ]);
        $mathKaz = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Mathematics',
            'language' => 'kaz',
            'stage1_question_count' => 25,
            'stage2_link' => 'https://example.com/math-stage-two',
        ]);
        $mathRus = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Mathematics',
            'language' => 'rus',
            'stage1_question_count' => 25,
        ]);
        $informaticsKaz = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Informatics',
            'language' => 'kaz',
            'stage1_question_count' => 25,
        ]);
        $physicsKaz = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Physics',
            'language' => 'kaz',
            'stage1_question_count' => 25,
        ]);
        $registration = OlympiadRegistration::create([
            'olympiad_id' => $olympiad->id,
            'user_id' => $student->id,
            'current_status' => 'registered',
            'test_language' => 'kaz',
            'profile_subjects' => 'math_informatics',
            'registered_at' => now(),
        ]);
        StageAttempt::create([
            'olympiad_registration_id' => $registration->id,
            'subject_id' => $mathKaz->id,
            'stage' => 1,
            'total_questions' => 25,
            'correct_answers' => 18,
            'score_percent' => 72,
            'is_passed' => true,
            'started_at' => now(),
            'submitted_at' => now(),
        ]);
        StageTwoSession::create([
            'olympiad_registration_id' => $registration->id,
            'subject_id' => $mathKaz->id,
            'status' => 'scheduled',
            'meeting_link' => 'https://example.com/math-stage-two',
        ]);

        Sanctum::actingAs($student);

        $this->getJson("/api/student/olympiads/{$olympiad->id}")
            ->assertOk()
            ->assertJsonPath('olympiad.id', $olympiad->id)
            ->assertJsonPath('olympiad.stage1_duration_minutes', 90)
            ->assertJsonPath('olympiad.stage2_starts_at', '2026-03-13T10:00:00.000000Z')
            ->assertJsonPath('olympiad.stage2_ends_at', '2026-03-13T12:00:00.000000Z')
            ->assertJsonPath('registration.current_status', 'registered')
            ->assertJsonPath('registration.test_language', 'kaz')
            ->assertJsonCount(2, 'subjects')
            ->assertJsonPath('subjects.0.id', $mathKaz->id)
            ->assertJsonPath('subjects.0.stage1_attempt.status', 'completed')
            ->assertJsonPath('subjects.0.stage1_attempt.score_percent', 72)
            ->assertJsonPath('subjects.0.stage2.eligible', true)
            ->assertJsonPath('subjects.0.stage2.status', 'scheduled')
            ->assertJsonPath('subjects.0.stage2.meeting_link', 'https://example.com/math-stage-two')
            ->assertJsonPath('subjects.0.stage2.starts_at', '2026-03-13T10:00:00.000000Z')
            ->assertJsonPath('subjects.1.id', $informaticsKaz->id);

        $this->assertDatabaseHas('subjects', ['id' => $mathRus->id, 'language' => 'rus']);
        $this->assertDatabaseHas('subjects', ['id' => $physicsKaz->id, 'language' => 'kaz']);
    }

    public function test_admin_can_save_subject_settings_with_one_request(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $curator = User::factory()->create(['role' => 'curator']);
        $olympiad = Olympiad::create([
            'title' => 'Test Olympiad',
            'stage1_question_count' => 25,
            'stage1_pass_percent' => 70,
        ]);
        $subject = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Mathematics',
            'stage1_question_count' => 25,
        ]);

        Question::create([
            'subject_id' => $subject->id,
            'text' => 'Question 1',
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->patchJson("/api/admin/subjects/{$subject->id}", [
            'stage1_question_count' => 50,
            'user_id' => $curator->id,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('stage1_question_count', 50)
            ->assertJsonPath('questions_count', 1)
            ->assertJsonPath('curators.0.id', $curator->id);

        $this->assertDatabaseHas('subjects', [
            'id' => $subject->id,
            'stage1_question_count' => 50,
        ]);
        $this->assertDatabaseHas('subject_curators', [
            'subject_id' => $subject->id,
            'user_id' => $curator->id,
        ]);
    }

    public function test_admin_can_view_olympiad_dashboard_and_update_settings(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create([
            'role' => 'student',
            'phone' => '70000000000',
            'region' => 'Kyzylorda',
            'city' => 'Kyzylorda',
            'school' => 'School 1',
            'test_language' => 'rus',
            'profile_subjects' => 'math_informatics',
        ]);
        $olympiad = Olympiad::create([
            'title' => 'Dashboard Olympiad',
            'stage1_question_count' => 25,
            'stage1_pass_percent' => 70,
        ]);
        $subject = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Informatics',
            'stage1_question_count' => 25,
        ]);
        OlympiadRegistration::create([
            'olympiad_id' => $olympiad->id,
            'user_id' => $student->id,
            'current_status' => 'registered',
            'registered_at' => now(),
        ]);
        Question::create([
            'subject_id' => $subject->id,
            'text' => 'Question 1',
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $dashboardResponse = $this->getJson("/api/admin/olympiads/{$olympiad->id}");

        $dashboardResponse
            ->assertOk()
            ->assertJsonPath('olympiad.title', 'Dashboard Olympiad')
            ->assertJsonPath('subjects.0.questions_count', 1)
            ->assertJsonPath('participants.0.user.name', $student->name);

        $updateResponse = $this->patchJson("/api/admin/olympiads/{$olympiad->id}", [
            'title' => 'Updated Olympiad',
            'stage1_question_count' => 50,
            'stage1_duration_minutes' => 90,
            'stage1_pass_percent' => 80,
            'registration_open' => false,
            'is_active' => true,
            'stage1_starts_at' => '2026-03-12 10:00:00',
            'stage1_ends_at' => '2026-03-12 12:00:00',
            'stage2_starts_at' => '2026-03-13 10:00:00',
            'stage2_ends_at' => '2026-03-13 12:00:00',
        ]);

        $updateResponse
            ->assertOk()
            ->assertJsonPath('olympiad.title', 'Updated Olympiad')
            ->assertJsonPath('olympiad.stage1_question_count', 50)
            ->assertJsonPath('olympiad.stage1_duration_minutes', 90)
            ->assertJsonPath('olympiad.stage1_pass_percent', 80)
            ->assertJsonPath('olympiad.registration_open', false)
            ->assertJsonPath('olympiad.stage1_starts_at', '2026-03-12T10:00:00.000000Z')
            ->assertJsonPath('olympiad.stage1_ends_at', '2026-03-12T12:00:00.000000Z')
            ->assertJsonPath('olympiad.stage2_starts_at', '2026-03-13T10:00:00.000000Z')
            ->assertJsonPath('olympiad.stage2_ends_at', '2026-03-13T12:00:00.000000Z');
    }

    public function test_admin_updating_stage_two_can_mark_registration_completed(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $olympiad = Olympiad::create([
            'title' => 'Stage Two Olympiad',
            'stage1_question_count' => 25,
            'stage1_pass_percent' => 70,
        ]);
        $subject = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Mathematics',
            'stage1_question_count' => 25,
        ]);
        $registration = OlympiadRegistration::create([
            'olympiad_id' => $olympiad->id,
            'user_id' => $student->id,
            'current_status' => 'stage2',
            'registered_at' => now(),
        ]);
        StageAttempt::create([
            'olympiad_registration_id' => $registration->id,
            'subject_id' => $subject->id,
            'stage' => 1,
            'total_questions' => 25,
            'correct_answers' => 20,
            'score_percent' => 80,
            'is_passed' => true,
            'started_at' => now(),
            'submitted_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $response = $this->patchJson("/api/admin/subjects/{$subject->id}/stage-two-result", [
            'olympiad_registration_id' => $registration->id,
            'status' => 'completed',
            'meeting_link' => 'https://example.com/meeting',
            'score_percent' => 88,
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('stage_two_sessions', [
            'olympiad_registration_id' => $registration->id,
            'subject_id' => $subject->id,
            'status' => 'completed',
        ]);
        $this->assertDatabaseHas('olympiad_registrations', [
            'id' => $registration->id,
            'current_status' => 'completed',
        ]);
    }

    public function test_admin_can_view_proctoring_recordings_for_participant(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $olympiad = Olympiad::create([
            'title' => 'Recorded Olympiad',
            'stage1_question_count' => 25,
            'stage1_pass_percent' => 70,
        ]);
        $registration = OlympiadRegistration::create([
            'olympiad_id' => $olympiad->id,
            'user_id' => $student->id,
            'current_status' => 'registered',
            'registered_at' => now(),
            'stage1_started_at' => now(),
        ]);
        $session = ProctoringSession::create([
            'olympiad_registration_id' => $registration->id,
            'stage' => 1,
            'status' => 'finished',
            'started_at' => now()->subMinutes(15),
            'finished_at' => now()->subMinutes(5),
        ]);

        Storage::disk('local')->put('proctoring/test-combined-000001.webm', 'fake-webm-data');

        $chunk = ProctoringChunk::create([
            'proctoring_session_id' => $session->id,
            'kind' => 'combined',
            'sequence' => 0,
            'disk' => 'local',
            'path' => 'proctoring/test-combined-000001.webm',
            'mime_type' => 'video/webm',
            'size_bytes' => 14,
        ]);
        $recording = ProctoringRecording::create([
            'proctoring_session_id' => $session->id,
            'kind' => 'combined',
            'disk' => 'local',
            'path' => 'proctoring/test-combined-000001.webm',
            'mime_type' => 'video/webm',
            'size_bytes' => 14,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/olympiads/{$olympiad->id}/registrations/{$registration->id}/proctoring")
            ->assertOk()
            ->assertJsonPath('registration.id', $registration->id)
            ->assertJsonPath('sessions.0.id', $session->id)
            ->assertJsonPath('sessions.0.combined_chunks.0.id', $chunk->id)
            ->assertJsonPath('sessions.0.combined_chunks.0.media_url', "/api/admin/proctoring-chunks/{$chunk->id}/media")
            ->assertJsonPath('sessions.0.combined_recording.id', $recording->id)
            ->assertJsonPath('sessions.0.combined_recording.available', true)
            ->assertJsonPath('sessions.0.combined_recording.media_url', "/api/admin/proctoring-recordings/{$recording->id}/media");

        $this->get("/api/admin/proctoring-chunks/{$chunk->id}/media")
            ->assertOk()
            ->assertHeader('content-type', 'video/webm');

        $this->get("/api/admin/proctoring-recordings/{$recording->id}/media")
            ->assertOk()
            ->assertHeader('content-type', 'video/webm');
    }

    public function test_admin_can_archive_olympiad_and_subject(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $olympiad = Olympiad::create([
            'title' => 'Archive Olympiad',
            'stage1_question_count' => 25,
            'stage1_pass_percent' => 70,
        ]);
        $subject = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Archive Subject',
            'stage1_question_count' => 25,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/subjects/{$subject->id}/archive")
            ->assertOk()
            ->assertJsonPath('archived', true);

        $this->patchJson("/api/admin/olympiads/{$olympiad->id}/archive")
            ->assertOk()
            ->assertJsonPath('archived', true);

        $this->assertDatabaseHas('subjects', [
            'id' => $subject->id,
            'is_archived' => true,
        ]);
        $this->assertDatabaseHas('olympiads', [
            'id' => $olympiad->id,
            'is_archived' => true,
        ]);
        $this->assertSame(0, Olympiad::query()->count());
        $this->assertSame(0, Subject::query()->count());
    }

    public function test_curator_can_view_only_assigned_subjects_and_questions(): void
    {
        $curator = User::factory()->create(['role' => 'curator']);
        $otherCurator = User::factory()->create(['role' => 'curator']);
        $olympiad = Olympiad::create([
            'title' => 'Curator Olympiad',
            'stage1_question_count' => 25,
            'stage1_pass_percent' => 70,
        ]);
        $assignedSubject = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Mathematics',
            'stage1_question_count' => 25,
        ]);
        $foreignSubject = Subject::create([
            'olympiad_id' => $olympiad->id,
            'name' => 'Physics',
            'stage1_question_count' => 25,
        ]);

        $assignedSubject->curators()->attach($curator->id);
        $foreignSubject->curators()->attach($otherCurator->id);

        $question = Question::create([
            'subject_id' => $assignedSubject->id,
            'text' => 'Assigned Question',
            'is_active' => true,
        ]);
        foreach (range(1, 5) as $optionIndex) {
            QuestionOption::create([
                'question_id' => $question->id,
                'text' => "Option {$optionIndex}",
                'is_correct' => $optionIndex === 1,
            ]);
        }

        Sanctum::actingAs($curator);

        $subjectsResponse = $this->getJson('/api/curator/subjects');
        $subjectsResponse
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $assignedSubject->id)
            ->assertJsonPath('0.name', 'Mathematics');

        $questionsResponse = $this->getJson("/api/curator/subjects/{$assignedSubject->id}/questions");
        $questionsResponse
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.text', 'Assigned Question')
            ->assertJsonCount(5, '0.options');

        $this->getJson("/api/curator/subjects/{$assignedSubject->id}/questions/{$question->id}")
            ->assertOk()
            ->assertJsonPath('text', 'Assigned Question')
            ->assertJsonCount(5, 'options');

        $this->getJson("/api/curator/subjects/{$foreignSubject->id}/questions")
            ->assertForbidden();
    }

    public function test_curator_can_upload_question_image_to_storage(): void
    {
        Storage::fake('public');

        $curator = User::factory()->create(['role' => 'curator']);

        Sanctum::actingAs($curator);

        $response = $this->post('/api/curator/question-images', [
            'image' => UploadedFile::fake()->image('formula.png', 640, 480),
        ]);

        $response
            ->assertCreated()
            ->assertJsonStructure(['location', 'path']);

        $path = $response->json('path');

        Storage::disk('public')->assertExists($path);

        $this->get($response->json('location'))
            ->assertOk();
    }
}
