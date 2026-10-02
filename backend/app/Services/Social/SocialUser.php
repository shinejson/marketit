<?php

namespace App\Services\Social;

/** A provider profile, normalised to the handful of fields we persist. */
class SocialUser
{
    public function __construct(
        public readonly string $id,
        public readonly ?string $email = null,
        public readonly ?string $name = null,
        public readonly ?string $nickname = null,
        public readonly ?string $avatar = null,
        public readonly bool $verified = false,
        public readonly bool $demo = false,
    ) {
    }

    public function displayName(): string
    {
        return $this->name
            ?: $this->nickname
            ?: ($this->email ? strstr($this->email, '@', true) : null)
            ?: 'Marketplace customer';
    }
}
