<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminProctoringController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CuratorQuestionController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\QuestionImageController;
use App\Http\Controllers\Api\StudentExamController;
use App\Http\Controllers\Api\StudentProctoringController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/media/{path}', [QuestionImageController::class, 'show'])->where('path', '.*');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/enroll', [AuthController::class, 'enroll'])->middleware('role:student');
    Route::get('/feedback', [FeedbackController::class, 'index']);
    Route::post('/feedback', [FeedbackController::class, 'store'])->middleware('role:student,curator');
    Route::patch('/feedback/{feedback}/reply', [FeedbackController::class, 'reply'])->middleware('role:admin');

    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/olympiads', [AdminController::class, 'olympiads']);
        Route::get('/olympiads/{olympiad}', [AdminController::class, 'showOlympiad']);
        Route::post('/olympiads', [AdminController::class, 'createOlympiad']);
        Route::patch('/olympiads/{olympiad}', [AdminController::class, 'updateOlympiad']);
        Route::patch('/olympiads/{olympiad}/registration', [AdminController::class, 'toggleRegistration']);
        Route::patch('/olympiads/{olympiad}/archive', [AdminController::class, 'archiveOlympiad']);
        Route::get('/olympiads/{olympiad}/registrations/{registration}/proctoring', [AdminProctoringController::class, 'show']);
        Route::post('/olympiads/{olympiad}/subjects', [AdminController::class, 'createSubject']);
        Route::patch('/subjects/{subject}', [AdminController::class, 'updateSubject']);
        Route::patch('/subjects/{subject}/archive', [AdminController::class, 'archiveSubject']);
        Route::post('/subjects/{subject}/curators', [AdminController::class, 'assignCurator']);
        Route::patch('/subjects/{subject}/stage-two-result', [AdminController::class, 'updateStageTwoResult']);
        Route::get('/proctoring-chunks/{chunk}/media', [AdminProctoringController::class, 'chunkMedia']);
        Route::get('/proctoring-recordings/{recording}/media', [AdminProctoringController::class, 'media']);
        Route::get('/users', [AdminController::class, 'users']);
    });

    Route::middleware('role:curator,admin')->prefix('curator')->group(function () {
        Route::post('/question-images', [QuestionImageController::class, 'upload']);
        Route::get('/subjects', [CuratorQuestionController::class, 'subjects']);
        Route::get('/subjects/{subject}/questions', [CuratorQuestionController::class, 'index']);
        Route::get('/subjects/{subject}/questions/{question}', [CuratorQuestionController::class, 'show']);
        Route::post('/subjects/{subject}/questions', [CuratorQuestionController::class, 'store']);
        Route::put('/subjects/{subject}/questions/{question}', [CuratorQuestionController::class, 'update']);
        Route::delete('/subjects/{subject}/questions/{question}', [CuratorQuestionController::class, 'destroy']);
    });

    Route::middleware('role:student')->prefix('student')->group(function () {
        Route::get('/olympiads', [StudentExamController::class, 'availableOlympiads']);
        Route::get('/olympiads/{olympiad}', [StudentExamController::class, 'showOlympiad']);
        Route::post('/olympiads/{olympiad}/stage-one/start', [StudentExamController::class, 'startOlympiadStageOne']);
        Route::post('/olympiads/{olympiad}/proctoring/start', [StudentProctoringController::class, 'start']);
        Route::post('/proctoring-sessions/{session}/chunks', [StudentProctoringController::class, 'uploadChunk']);
        Route::post('/proctoring-sessions/{session}/finish', [StudentProctoringController::class, 'finish']);
        Route::post('/subjects/{subject}/stage-one/start', [StudentExamController::class, 'startStageOne']);
        Route::patch('/subjects/{subject}/stage-one/answer', [StudentExamController::class, 'saveStageOneAnswer']);
        Route::post('/subjects/{subject}/stage-one/submit', [StudentExamController::class, 'submitStageOne']);
        Route::get('/olympiads/{olympiad}/results', [StudentExamController::class, 'results']);
    });
});
