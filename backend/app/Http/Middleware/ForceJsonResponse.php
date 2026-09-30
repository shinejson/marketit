<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * API endpoints always answer JSON. Without this, a client that omits the
 * Accept header triggers Laravel's redirect-to-login path for 401s, which
 * fails with "Route [login] not defined".
 */
class ForceJsonResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('api/*') || str_starts_with($request->path(), '/api')) {
            $request->headers->set('Accept', 'application/json');
        }

        return $next($request);
    }
}
