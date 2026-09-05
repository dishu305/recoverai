from dataclasses import dataclass


@dataclass
class PolicyDecision:
    allowed: bool
    reason: str
    action: str


# RecoverAI safety / bounded-execution rules
MAX_RETRIES = 2
MIN_RECOVERY_SCORE = 60


def evaluate_recovery_policy(
    recovery_score: float,
    recommended_action: str,
    retry_count: int = 0,
    recovery_status: str = "pending",
) -> PolicyDecision:

    # Never act on an already recovered case
    if recovery_status == "recovered":
        return PolicyDecision(
            allowed=False,
            reason="Payment has already been recovered.",
            action="stop",
        )

    # Never retry indefinitely
    if retry_count >= MAX_RETRIES:
        return PolicyDecision(
            allowed=False,
            reason=f"Maximum retry limit of {MAX_RETRIES} reached.",
            action="stop",
        )

    # Low-confidence cases should not be automatically executed
    if recovery_score < MIN_RECOVERY_SCORE:
        return PolicyDecision(
            allowed=False,
            reason=(
                f"Recovery score {recovery_score} is below "
                f"the automatic execution threshold of "
                f"{MIN_RECOVERY_SCORE}."
            ),
            action="manual_review",
        )

    # Only allow actions our agent explicitly understands
    allowed_actions = {
        "retry_payment",
        "send_payment_link",
        "manual_review",
    }

    if recommended_action not in allowed_actions:
        return PolicyDecision(
            allowed=False,
            reason="Unknown recovery action.",
            action="manual_review",
        )

    # Manual review is never automatically executed
    if recommended_action == "manual_review":
        return PolicyDecision(
            allowed=False,
            reason="Case requires manual review.",
            action="manual_review",
        )

    return PolicyDecision(
        allowed=True,
        reason="Recovery action passed all policy checks.",
        action=recommended_action,
    )
