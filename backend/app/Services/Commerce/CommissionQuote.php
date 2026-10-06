<?php

namespace App\Services\Commerce;

/**
 * The outcome of running the commission rule engine over one seller group.
 */
class CommissionQuote
{
    public function __construct(
        public readonly string $amount,
        public readonly string $rate,
        public readonly ?int $ruleId = null,
        public readonly string $ruleName = 'Platform default',
        public readonly string $calculation = 'percentage',
        public readonly string $basis = '0.00',
    ) {}

    public function toArray(): array
    {
        return [
            'amount' => $this->amount,
            'rate' => $this->rate,
            'rule_id' => $this->ruleId,
            'rule_name' => $this->ruleName,
            'calculation' => $this->calculation,
            'basis' => $this->basis,
        ];
    }
}
