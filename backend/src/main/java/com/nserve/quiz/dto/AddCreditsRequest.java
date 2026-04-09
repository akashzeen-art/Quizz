package com.nserve.quiz.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Add credits to the wallet. Production flows should set {@code amountRupees} (2 credits per ₹1).
 * Optional {@code credits} supports direct grants (e.g. promos); combine with payment metadata later.
 */
public record AddCreditsRequest(
    @Min(0) @Max(10_000_000) Integer amountRupees,
    @Min(0) @Max(10_000_000) Integer credits,
    /** Reserved for Razorpay/Stripe-style reconciliation (optional). */
    String paymentProvider,
    /** Idempotency / external charge id from the payment provider (optional). */
    String externalPaymentId) {}
