<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Heartbeat for the profile page's "last seen" line. Writes at most once a
 * minute per user, quietly, so it never becomes a hot path.
 */
class TrackUserActivity
{
    public function handle(Request $request, Closure $next): Response
    {
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
