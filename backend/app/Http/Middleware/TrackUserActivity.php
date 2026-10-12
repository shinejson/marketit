<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Heartbeat for a user's last activity. This runs after auth:sanctum so it
 * sees bearer-token users as well as stateful sessions. Writes at most once a
 * minute per user, quietly, so it never becomes a hot path.
 *
 * Logout is intentionally excluded: it has its own audit event and must not
 * overwrite the user's last in-session activity timestamp.
 */
class TrackUserActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->routeIs('auth.logout')) {
            return $next($request);
        }

        $user = $request->user();

        if ($user && (! $user->last_seen_at || $user->last_seen_at->lt(now()->subMinute()))) {
            try {
                $user->forceFill(['last_seen_at' => now()])->saveQuietly();
            } catch (\Throwable) {
                // Never let presence tracking break a request.
            }
        }

        return $next($request);
    }
}
