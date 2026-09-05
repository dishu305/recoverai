
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RecoveryCase, AuditLog


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
):
    cases = db.query(RecoveryCase).all()

    total_failed = len(cases)

    revenue_at_risk = sum(
        case.amount
        for case in cases
        if case.recovery_status != "recovered"
    )

    recoverable_revenue = sum(
        case.amount
        for case in cases
        if case.risk_score >= 60
        and case.recovery_status != "recovered"
    )

    recovered_revenue = sum(
        case.amount
        for case in cases
        if case.recovery_status == "recovered"
    )

    total_revenue = (
        revenue_at_risk + recovered_revenue
    )

    recovery_rate = (
        recovered_revenue / total_revenue * 100
        if total_revenue > 0
        else 0
    )

    high_priority = sum(
        1
        for case in cases
        if case.risk_score >= 80
        and case.recovery_status != "recovered"
    )

    retry_cases = sum(
        1
        for case in cases
        if case.recommended_action == "retry_payment"
    )

    payment_link_cases = sum(
        1
        for case in cases
        if case.recommended_action == "send_payment_link"
    )

    manual_review_cases = sum(
        1
        for case in cases
        if case.recovery_status == "manual_review"
    )

    executed_actions = (
        db.query(AuditLog)
        .filter(
            AuditLog.action == "RECOVERY_EXECUTION"
        )
        .count()
    )

    successful_actions = (
        db.query(AuditLog)
        .filter(
            AuditLog.action == "RECOVERY_EXECUTION",
            AuditLog.status == "success",
        )
        .count()
    )

    return {
        "total_failed_payments": total_failed,
        "revenue_at_risk": round(
            revenue_at_risk,
            2,
        ),
        "recoverable_revenue": round(
            recoverable_revenue,
            2,
        ),
        "recovered_revenue": round(
            recovered_revenue,
            2,
        ),
        "recovery_rate": round(
            recovery_rate,
            2,
        ),
        "high_priority_cases": high_priority,
        "retry_cases": retry_cases,
        "payment_link_cases": payment_link_cases,
        "manual_review_cases": manual_review_cases,
        "executed_actions": executed_actions,
        "successful_actions": successful_actions,
    }


@router.get("/cases")
def dashboard_cases(
    db: Session = Depends(get_db),
):
    cases = (
        db.query(RecoveryCase)
        .order_by(
            RecoveryCase.created_at.desc()
        )
        .all()
    )

    return [
        {
            "id": case.id,
            "payment_id": case.payment_id,
            "customer_email": case.customer_email,
            "amount": case.amount,
            "currency": case.currency,
            "failure_reason": case.failure_reason,
            "risk_score": case.risk_score,
            "retry_count": case.retry_count,
            "status": case.recovery_status,
            "recommended_action": case.recommended_action,
            "ai_reasoning": case.ai_reasoning,
            "created_at": case.created_at,
        }
        for case in cases
    ]