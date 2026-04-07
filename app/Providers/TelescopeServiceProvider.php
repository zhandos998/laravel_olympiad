<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Telescope\IncomingEntry;
use Laravel\Telescope\Telescope;
use Laravel\Telescope\TelescopeApplicationServiceProvider;
use Symfony\Component\HttpFoundation\IpUtils;

class TelescopeServiceProvider extends TelescopeApplicationServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Telescope::night();

        $this->hideSensitiveRequestDetails();

        $recordAll = $this->app->environment('local') || config('telescope.record_all', false);

        Telescope::filter(function (IncomingEntry $entry) use ($recordAll) {
            return $recordAll ||
                   $entry->isReportableException() ||
                   $entry->isFailedRequest() ||
                   $entry->isFailedJob() ||
                   $entry->isScheduledTask() ||
                   $entry->hasMonitoredTag();
        });
    }

    /**
     * Prevent sensitive request details from being logged by Telescope.
     */
    protected function hideSensitiveRequestDetails(): void
    {
        if ($this->app->environment('local')) {
            return;
        }

        Telescope::hideRequestParameters(['_token']);

        Telescope::hideRequestHeaders([
            'authorization',
            'cookie',
            'x-csrf-token',
            'x-xsrf-token',
        ]);
    }

    /**
     * Register the Telescope gate.
     *
     * This gate determines who can access Telescope in non-local environments.
     */
    protected function gate(): void
    {
        Gate::define('viewTelescope', function (?User $user = null) {
            if ($this->app->environment('local')) {
                return true;
            }

            if ($user?->isAdmin()) {
                return true;
            }

            $request = request();

            if ($request) {
                $allowedIps = config('telescope.allowed_ips', []);

                if ($allowedIps !== [] && IpUtils::checkIp($request->ip(), $allowedIps)) {
                    return true;
                }

                $token = PersonalAccessToken::findToken((string) $request->bearerToken());

                if ($token?->tokenable instanceof User && $token->tokenable->isAdmin()) {
                    return true;
                }
            }

            $allowedEmails = config('telescope.allowed_emails', []);

            return $user
                ? in_array(mb_strtolower($user->email), $allowedEmails, true)
                : false;
        });
    }
}
