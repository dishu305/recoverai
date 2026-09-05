from typing import Any


def classify_failure(failure_reason: str) -> str:
    reason = failure_reason.lower()

    if "insufficient" in reason:
        return "insufficient_funds"

    if "timeout" in reason:
        return "timeout"

    if "network" in reason:
        return "network_failure"

    if "declined" in reason:
        return "card_declined"

    if "expired" in reason:
        return "expired_card"

    return "unknown"


def calculate_recovery_score(
    amount: float,
    failure_reason: str,
) -> int:
    score = 70

    reason = failure_reason.lower()

    if "timeout" in reason:
        score += 15

    if "network" in reason:
        score += 10

    if "insufficient" in reason:
        score -= 20

    if "declined" in reason:
        score -= 10

    if amount > 50000:
        score -= 5

    return max(0, min(100, score))


def determine_action(
    score: int,
    failure_reason: str,
) -> str:
    reason = failure_reason.lower()

    if "insufficient" in reason:
        return "send_payment_link"

    if score >= 80:
        return "retry_payment"

    if score >= 60:
        return "send_payment_link"

    return "manual_review"


def analyze_payment(payment: dict[str, Any]) -> dict[str, Any]:
    amount = payment.get("amount", 0)
    failure_reason = payment.get(
        "error_description",
        "Payment failed",
    )

    amount_rupees = amount / 100 if amount else 0

    failure_type = classify_failure(
        failure_reason
    )

    score = calculate_recovery_score(
        amount_rupees,
        failure_reason,
    )

    action = determine_action(
        score,
        failure_reason,
    )

    if score >= 80:
        urgency = "high"
    elif score >= 60:
        urgency = "medium"
    else:
        urgency = "low"

    return {
        "recovery_score": score,
        "failure_type": failure_type,
        "recommended_action": action,
        "urgency": urgency,
        "confidence": min(0.95, 0.60 + score / 250),
        "reasoning": (
            f"The payment failed because of "
            f"{failure_type}. "
            f"The recovery score is {score}/100. "
            f"The recommended action is {action}."
        ),
    }