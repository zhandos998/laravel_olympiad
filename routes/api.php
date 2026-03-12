<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CuratorQuestionController;
use App\Http\Controllers\Api\StudentExamController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/enroll', [AuthController::class, 'enroll'])->middleware('role:student');

    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/olympiads', [AdminController::class, 'olympiads']);
        Route::post('/olympiads', [AdminController::class, 'createOlympiad']);
        Route::patch('/olympiads/{olympiad}/registration', [AdminController::class, 'toggleRegistration']);
        Route::post('/olympiads/{olympiad}/subjects', [AdminController::class, 'createSubject']);
        Route::post('/subjects/{subject}/curators', [AdminController::class, 'assignCurator']);
        Route::patch('/subjects/{subject}/stage-two-result', [AdminController::class, 'updateStageTwoResult']);
        Route::get('/users', [AdminController::class, 'users']);
    });

    Route::middleware('role:curator,admin')->prefix('curator')->group(function () {
        Route::get('/subjects/{subject}/questions', [CuratorQuestionController::class, 'index']);
        Route::post('/subjects/{subject}/questions', [CuratorQuestionController::class, 'store']);
        Route::put('/subjects/{subject}/questions/{question}', [CuratorQuestionController::class, 'update']);
        Route::delete('/subjects/{subject}/questions/{question}', [CuratorQuestionController::class, 'destroy']);
    });

    Route::middleware('role:student')->prefix('student')->group(function () {
        Route::get('/olympiads', [StudentExamController::class, 'availableOlympiads']);
        Route::post('/subjects/{subject}/stage-one/start', [StudentExamController::class, 'startStageOne']);
        Route::post('/subjects/{subject}/stage-one/submit', [StudentExamController::class, 'submitStageOne']);
        Route::get('/olympiads/{olympiad}/results', [StudentExamController::class, 'results']);
    });
});
