<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Olympiad;
use App\Models\OlympiadRegistration;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30'],
            'region' => ['required', 'string', 'max:120'],
            'city' => ['required', 'string', 'max:120'],
            'school' => ['required', 'string', 'max:255'],
            'test_language' => ['required', Rule::in(User::TEST_LANGUAGES)],
            'profile_subjects' => ['required', Rule::in(User::PROFILE_SUBJECTS)],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'region' => $data['region'],
            'city' => $data['city'],
            'school' => $data['school'],
            'test_language' => $data['test_language'],
            'profile_subjects' => $data['profile_subjects'],
            'password' => $data['password'],
            'role' => 'student',
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 422);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function enroll(Request $request)
    {
        $data = $request->validate([
            'olympiad_id' => ['required', 'integer', Rule::exists('olympiads', 'id')],
        ]);

        $olympiad = Olympiad::findOrFail($data['olympiad_id']);

        if (!$olympiad->registration_open) {
            return response()->json(['message' => 'Registration for this olympiad is closed'], 422);
        }

        $registration = OlympiadRegistration::firstOrCreate(
            ['olympiad_id' => $olympiad->id, 'user_id' => $request->user()->id],
            ['registered_at' => now(), 'current_status' => 'registered']
        );

        return response()->json($registration, $registration->wasRecentlyCreated ? 201 : 200);
    }
}
