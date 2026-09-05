from datetime import datetime
import json

from sqlalchemy.orm import Session

from app.agent.graph import run_recovery_agent
from app.models import Customer, RecoveryCase, AuditLog


def process_payment_failure(
    db: Session,
    payment: dict,
):
    payment_id = payment.get("id", "unknown")
    amount = payment.get("amount", 0)
    currency = payment.get("currency", "INR")
    email = payment.get(
        "email",
        "unknown@example.com",
    )

    failure_reason = payment.get(
        "error_description",
        "Payment failed",
    )

    # Razorpay amounts are received in paise.
    amount_rupees = amount / 100 if amount else 0

    # -------------------------------------------------
    # 1. Find or create customer
    # -------------------------------------------------

    customer = (
        db.query(Customer)
        .filter(Customer.email == email)
        .first()
    )

    if not customer:
        customer = Customer(
            email=email,
            name=payment.get(
                "notes",
                {},
            ).get(
                "customer_name",
                "Unknown Customer",
            ),
        )

        db.add(customer)
        db.commit()
        db.refresh(customer)

    # -------------------------------------------------
    # 2. Run RecoverAI LangGraph agent
    # -------------------------------------------------

    agent_result = run_recovery_agent(
        payment
    )

    recovery_score = agent_result.get(
        "recovery_score",
        0,
    )

    recommended_action = agent_result.get(
        "recommended_action",
        "manual_review",
    )

    failure_type = agent_result.get(
        "failure_type",
        "unknown",
    )

    urgency = agent_result.get(
        "urgency",
        "low",
    )

    confidence = agent_result.get(
        "confidence",
        0,
    )

    reasoning = agent_result.get(
        "reasoning",
        "",
    )

    policy_allowed = agent_result.get(
        "policy_allowed",
        False,
    )

    policy_reason = agent_result.get(
        "policy_reason",
        "",
    )

    should_execute = agent_result.get(
        "should_execute",
        False,
    )

    stopping_reason = agent_result.get(
        "stopping_reason",
        "",
    )

    # -------------------------------------------------
    # 3. Create recovery case
    # -------------------------------------------------

    recovery_case = RecoveryCase(
        customer_id=customer.id,
        payment_id=payment_id,
        customer_email=email,
        amount=amount_rupees,
        currency=currency,
        failure_reason=failure_reason,
        risk_score=recovery_score,
        recovery_status="pending",
        recommended_action=recommended_action,
        ai_reasoning=reasoning,
        created_at=datetime.utcnow(),
    )

    db.add(recovery_case)
    db.commit()
    db.refresh(recovery_case)

    # -------------------------------------------------
    # 4. Store AI analysis audit event
    # -------------------------------------------------

    db.add(
        AuditLog(
            recovery_case_id=recovery_case.id,
            action="AI_ANALYSIS",
            status="completed",
            details=json.dumps(
                {
                    "failure_type": failure_type,
                    "recovery_score": recovery_score,
                    "urgency": urgency,
                    "confidence": confidence,
                    "reasoning": reasoning,
                }
            ),
        )
    )

    # -------------------------------------------------
    # 5. Store policy decision
    # -------------------------------------------------

    db.add(
        AuditLog(
            recovery_case_id=recovery_case.id,
            action="POLICY_CHECK",
            status=(
                "allowed"
                if policy_allowed
                else "blocked"
            ),
            details=policy_reason,
        )
    )

    # -------------------------------------------------
    # 6. Store stopping-rule decision
    # -------------------------------------------------

    db.add(
        AuditLog(
            recovery_case_id=recovery_case.id,
            action="STOPPING_RULE",
            status=(
                "passed"
                if should_execute
                else "stopped"
            ),
            details=stopping_reason,
        )
    )

    db.commit()

    # -------------------------------------------------
    # 7. Return complete recovery decision
    # -------------------------------------------------

    return {
        "case_id": recovery_case.id,
        "payment_id": payment_id,
        "amount": amount_rupees,
        "currency": currency,
        "failure_type": failure_type,
        "recovery_score": recovery_score,
        "recommended_action": recommended_action,
        "urgency": urgency,
        "confidence": confidence,
        "policy_allowed": policy_allowed,
        "policy_reason": policy_reason,
        "should_execute": should_execute,
        "stopping_reason": stopping_reason,
        "status": recovery_case.recovery_status,
    }