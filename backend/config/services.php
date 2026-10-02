<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Customer social login
    |--------------------------------------------------------------------------
    |
    | Marketplace customers can sign in with an OAuth provider. A provider is
    | offered on the login page as soon as it has a client id and secret (and
    | is not explicitly disabled). `social.demo` lets non-production
    | environments exercise the whole flow without real OAuth apps — it is
    | ignored when credentials exist and refused in production.
    |
    */

    'social' => [
        'demo' => env('SOCIAL_LOGIN_DEMO', true),
    ],

    'google' => [
        'enabled' => env('GOOGLE_LOGIN_ENABLED', true),
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    ],

    'facebook' => [
        'enabled' => env('FACEBOOK_LOGIN_ENABLED', true),
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
    ],

    'apple' => [
        'enabled' => env('APPLE_LOGIN_ENABLED', true),
        'client_id' => env('APPLE_CLIENT_ID'),
        'client_secret' => env('APPLE_CLIENT_SECRET'),
    ],

    'github' => [
        'enabled' => env('GITHUB_LOGIN_ENABLED', false),
        'client_id' => env('GITHUB_CLIENT_ID'),
        'client_secret' => env('GITHUB_CLIENT_SECRET'),
    ],

];
