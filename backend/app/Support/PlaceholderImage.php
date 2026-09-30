<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Seeded/demo products point at /storage/placeholders/<slug>.svg
 * (see ProductImage::url), so the matching file has to exist on the public
 * disk — otherwise every product card renders a broken image.
 */
class PlaceholderImage
{
    /** @var array<int, array{0: string, 1: string}> */
    private const PALETTE = [
        ['#1f4b3a', '#c45c26'],
        ['#c45c26', '#c9a227'],
        ['#1c1914', '#c45c26'],
        ['#4a453c', '#1f4b3a'],
    ];

    public static function make(string $slug, string $name): void
    {
        $disk = Storage::disk('public');
        $path = 'placeholders/'.$slug.'.svg';

        if ($disk->exists($path)) {
            return;
        }

        [$from, $to] = self::PALETTE[abs(crc32($slug)) % count(self::PALETTE)];
        $label = htmlspecialchars(Str::limit($name, 28), ENT_QUOTES | ENT_XML1, 'UTF-8');

        $disk->put($path, <<<SVG
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="640" height="640" role="img" aria-label="{$label}">
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="{$from}" />
                  <stop offset="1" stop-color="{$to}" />
                </linearGradient>
              </defs>
              <rect width="640" height="640" fill="url(#g)" />
              <circle cx="510" cy="140" r="150" fill="#fffdf8" opacity="0.10" />
              <circle cx="110" cy="530" r="190" fill="#fffdf8" opacity="0.07" />
              <text x="48" y="548" font-family="Georgia, 'Times New Roman', serif" font-size="38" fill="#fffdf8">{$label}</text>
              <text x="48" y="586" font-family="Segoe UI, system-ui, sans-serif" font-size="19" fill="#fffdf8" opacity="0.7">MarketHub placeholder image</text>
            </svg>
            SVG);
    }
}
