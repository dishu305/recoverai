from typing import Any

from langgraph.graph import StateGraph, END

from app.agent.state import RecoveryState
from app.agent.nodes import analyze_payment


def analyze_node(
    state: RecoveryState,
) -> RecoveryState:
    """
    Analyze the failed payment and determine
    recovery probability and recommended action.
    """

    payment = state["payment"]

    analysis = analyze_payment(payment)

    return {
        **state,
        "failure_type": analysis["failure_type"],
        "recovery_score": analysis["recovery_score"],
        "recommended_action": analysis["recommended_action"],
        "urgency": analysis["urgency"],
        "confidence": analysis["confidence"],
        "reasoning": analysis["reasoning"],
        "audit_events": [
            {
                "action": "AI_ANALYSIS",
                "status": "completed",
                "details": (
                    f"Failure classified as "
                    f"{analysis['failure_type']}. "
                    f"Recovery score: "
                    f"{analysis['recovery_score']}/100."
                ),
            }
        ],
    }


def policy_node(
    state: RecoveryState,
) -> RecoveryState:
    """
    Apply bounded recovery policies.

    The AI can recommend an action, but policy
    determines whether that action is allowed.
    """

    score = state.get("recovery_score", 0)
    action = state.get(
        "recommended_action",
        "manual_review",
    )

    failure_type = state.get(
        "failure_type",
        "unknown",
    )

    # Default: block execution.
    allowed = False
    reason = "Recovery action did not pass policy."

    # High-confidence transient failures can be retried.
    if (
        action == "retry_payment"
        and score >= 80
        and failure_type in {
            "timeout",
            "network_failure",
        }
    ):
        allowed = True
        reason = (
            "Transient payment failure with "
            "high recovery probability."
        )

    # Payment links are allowed for recoverable
    # insufficient-funds situations.
    elif (
        action == "send_payment_link"
        and score >= 50
        and failure_type == "insufficient_funds"
    ):
        allowed = True
        reason = (
            "Insufficient funds detected; "
            "payment-link recovery is allowed."
        )

    # Medium-confidence cases can receive a
    # payment link as a bounded intervention.
    elif (
        action == "send_payment_link"
        and score >= 60
    ):
        allowed = True
        reason = (
            "Recovery score meets the payment-link "
            "threshold."
        )

    return {
        **state,
        "policy_allowed": allowed,
        "policy_reason": reason,
        "should_execute": allowed,
        "audit_events": state.get(
            "audit_events",
            [],
        )
        + [
            {
                "action": "POLICY_CHECK",
                "status": (
                    "allowed"
                    if allowed
                    else "blocked"
                ),
                "details": reason,
            }
        ],
    }


def stopping_node(
    state: RecoveryState,
) -> RecoveryState:
    """
    Apply stopping rules before execution.
    """

    if not state.get("policy_allowed", False):
        return {
            **state,
            "should_execute": False,
            "stopping_reason": (
                state.get(
                    "policy_reason",
                    "Policy blocked execution.",
                )
            ),
            "audit_events": state.get(
                "audit_events",
                [],
            )
            + [
                {
                    "action": "STOPPING_RULE",
                    "status": "stopped",
                    "details": (
                        "Execution stopped by "
                        "policy guardrail."
                    ),
                }
            ],
        }

    return {
        **state,
        "should_execute": True,
        "stopping_reason": (
            "Action passed all stopping rules."
        ),
        "audit_events": state.get(
            "audit_events",
            [],
        )
        + [
            {
                "action": "STOPPING_RULE",
                "status": "passed",
                "details": (
                    "Action passed bounded "
                    "execution rules."
                ),
            }
        ],
    }


def build_recovery_graph():
    """
    Build the RecoverAI LangGraph decision workflow.
    """

    workflow = StateGraph(RecoveryState)

    workflow.add_node(
        "analyze_payment",
        analyze_node,
    )

    workflow.add_node(
        "policy_check",
        policy_node,
    )

    workflow.add_node(
        "stopping_rules",
        stopping_node,
    )

    workflow.set_entry_point(
        "analyze_payment"
    )

    workflow.add_edge(
        "analyze_payment",
        "policy_check",
    )

    workflow.add_edge(
        "policy_check",
        "stopping_rules",
    )

    workflow.add_edge(
        "stopping_rules",
        END,
    )

    return workflow.compile()


recovery_graph = build_recovery_graph()


def run_recovery_agent(
    payment: dict[str, Any],
) -> RecoveryState:
    """
    Run the complete RecoverAI decision workflow.
    """

    initial_state: RecoveryState = {
        "payment": payment,
        "audit_events": [],
    }

    result = recovery_graph.invoke(
        initial_state
    )

    return result