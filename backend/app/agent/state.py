from typing import Any, TypedDict


class RecoveryState(TypedDict, total=False):
    payment: dict[str, Any]

    failure_type: str
    recovery_score: int
    recommended_action: str
    urgency: str
    confidence: float
    reasoning: str

    policy_allowed: bool
    policy_reason: str

    should_execute: bool
    stopping_reason: str

    audit_events: list[dict[str, Any]]