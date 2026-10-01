<?php

namespace App\Services\Sms;

use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Thin SMS dispatcher driven entirely by the platform settings. Providers that need a
 * real HTTP call get one; everything else falls back to the log transport so the
 * console stays usable before credentials exist.
 */
class SmsGateway
{
    /** @return array{ok: bool, provider: string, message: string, reference: ?string, sent_at: ?string} */
    public function send(string $to, string $body): array
    {
        $settings = PlatformSetting::map();
        $provider = $settings['sms_provider'] ?? 'log';
        $sender = $settings['sms_sender_id'] ?? 'MarketHub';
        $key = $settings['sms_api_key'] ?? null;
        $secret = $settings['sms_api_secret'] ?? null;
        $endpoint = $settings['sms_endpoint'] ?? null;

        if (! ($settings['sms_enabled'] ?? false)) {
            return $this->result(false, $provider, 'SMS is switched off. Enable it before sending.');
        }

        if ($provider === 'log') {
            Log::info('[sms] test message', compact('to', 'sender') + ['body' => $body]);

            return $this->result(true, $provider, "Provider is set to log — the message for $to was written to the application log.", 'log-'.Str::lower(Str::random(10)));
        }

        if (in_array($provider, ['twilio', 'vonage', 'africastalking', 'termii', 'mnotify', 'custom'], true) && blank($key)) {
            return $this->result(false, $provider, 'Add an API key for this provider before sending a test.');
        }

        try {
            $response = match ($provider) {
                'twilio' => Http::timeout(12)
                    ->withBasicAuth((string) $key, (string) $secret)
                    ->asForm()
                    ->post("https://api.twilio.com/2010-04-01/Accounts/{$key}/Messages.json", [
                        'To' => $to,
                        'From' => $sender,
                        'Body' => $body,
                    ]),
                'vonage' => Http::timeout(12)->asForm()->post('https://rest.nexmo.com/sms/json', [
                    'api_key' => $key,
                    'api_secret' => $secret,
                    'to' => ltrim($to, '+'),
                    'from' => $sender,
                    'text' => $body,
                ]),
                'africastalking' => Http::timeout(12)
                    ->withHeaders(['apiKey' => (string) $key, 'Accept' => 'application/json'])
                    ->asForm()
                    ->post('https://api.africastalking.com/version1/messaging', [
                        'username' => $secret ?: 'sandbox',
                        'to' => $to,
                        'from' => $sender,
                        'message' => $body,
                    ]),
                'termii' => Http::timeout(12)->post('https://api.ng.termii.com/api/sms/send', [
                    'api_key' => $key,
                    'to' => ltrim($to, '+'),
                    'from' => $sender,
                    'sms' => $body,
                    'type' => 'plain',
                    'channel' => 'generic',
                ]),
                'mnotify' => Http::timeout(12)->post('https://api.mnotify.com/api/sms/quick?key='.$key, [
                    'recipient' => [$to],
                    'sender' => $sender,
                    'message' => $body,
                ]),
                default => $this->custom($endpoint, $to, $sender, $body, $key, $secret),
            };
        } catch (Throwable $e) {
            return $this->result(false, $provider, 'Gateway error: '.$e->getMessage());
        }

        if ($response === null) {
            return $this->result(false, $provider, 'Set a custom endpoint URL before sending a test.');
        }

        if ($response->failed()) {
            return $this->result(false, $provider, 'Gateway rejected the message ('.$response->status().'): '.Str::limit($response->body(), 160));
        }

        return $this->result(true, $provider, "Test message accepted by the gateway for $to.", $this->reference($response->json()));
    }

    protected function custom(?string $endpoint, string $to, ?string $sender, string $body, ?string $key, ?string $secret)
    {
        if (blank($endpoint)) {
            return null;
        }

        return Http::timeout(12)
            ->withHeaders(array_filter([
                'Authorization' => $key ? 'Bearer '.$key : null,
                'X-Api-Secret' => $secret ?: null,
            ]))
            ->post($endpoint, [
                'to' => $to,
                'from' => $sender,
                'message' => $body,
            ]);
    }

    protected function reference(mixed $payload): ?string
    {
        if (! is_array($payload)) {
            return null;
        }

        foreach (['sid', 'message_id', 'messageId', 'id', 'reference'] as $field) {
            if (isset($payload[$field]) && is_scalar($payload[$field])) {
                return (string) $payload[$field];
            }
        }

        return null;
    }

    protected function result(bool $ok, string $provider, string $message, ?string $reference = null): array
    {
        return [
            'ok' => $ok,
            'provider' => $provider,
            'message' => $message,
            'reference' => $reference,
            'sent_at' => $ok ? now()->toIso8601String() : null,
        ];
    }
}
