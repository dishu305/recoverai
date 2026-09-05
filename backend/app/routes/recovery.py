
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RecoveryCase
from app.services.execution_service import execute_recovery


router = APIRouter(
    prefix="/recovery",
    tags=["Recovery"],
)


@router.get("/cases")
def get_recovery_cases(
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
            "recovery_score": case.risk_score,
            "status": case.recovery_status,
            "recommended_action": case.recommended_action,
            "reason": case.ai_reasoning,
            "created_at": case.created_at,
        }
        for case in cases
    ]


@router.get("/cases/{case_id}")
def get_recovery_case(
    case_id: int,
    db: Session = Depends(get_db),
):
    case = (
        db.query(RecoveryCase)
        .filter(
            RecoveryCase.id == case_id
        )
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Recovery case not found",
        )

    return {
        "id": case.id,
        "payment_id": case.payment_id,
        "customer_email": case.customer_email,
        "amount": case.amount,
        "currency": case.currency,
        "failure_reason": case.failure_reason,
        "recovery_score": case.risk_score,
        "status": case.recovery_status,
        "recommended_action": case.recommended_action,
        "reason": case.ai_reasoning,
        "created_at": case.created_at,
    }


@router.post("/cases/{case_id}/execute")
def execute_recovery_case(
    case_id: int,
    db: Session = Depends(get_db),
):
    case = (
        db.query(RecoveryCase)
        .filter(
            RecoveryCase.id == case_id
        )
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Recovery case not found",
        )

    result = execute_recovery(
        db=db,
        case=case,
    )

    return result


@router.get("/cases/{case_id}/audit")
def get_recovery_audit(
    case_id: int,
    db: Session = Depends(get_db),
):
    from app.models import AuditLog

    case = (
        db.query(RecoveryCase)
        .filter(
            RecoveryCase.id == case_id
        )
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Recovery case not found",
        )

    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.recovery_case_id == case_id
        )
        .order_by(
            AuditLog.created_at.asc()
        )
        .all()
    )

    return [
        {
            "id": log.id,
            "action": log.action,
            "status": log.status,
            "details": log.details,
            "created_at": log.created_at,
        }
        for log in logs
    ]