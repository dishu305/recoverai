from datetime import datetime

from sqlalchemy.orm import Session

from app.models import RecoveryCase, AuditLog


def add_audit(
    db: Session,
    case_id: int,
    action: str,
    status: str,
    details: str,
):
    audit = AuditLog(
        recovery_case_id=case_id,
        action=action,
        status=status,
        details=details,
        created_at=datetime.utcnow(),
    )

    db.add(audit)


def execute_recovery(
    db: Session,
    case: RecoveryCase,
):
    # ---------------------------------------------------------
    # 1. STOP IF ALREADY RECOVERED
    # ---------------------------------------------------------

    if case.recovery_status == "recovered":
        return {
            "success": False,
            "message": "Recovery already completed.",
            "case_id": case.id,
            "status": case.recovery_status,
        }

    # ---------------------------------------------------------
    # 2. CHECK ALLOWED AUTOMATIC ACTIONS
    # ---------------------------------------------------------

    allowed_actions = {
        "retry_payment",
        "send_payment_link",
    }

    if case.recommended_action not in allowed_actions:
        add_audit(
            db=db,
            case_id=case.id,
            action="EXECUTION",
            status="blocked",
            details=(
                f"Action '{case.recommended_action}' "
                "is not allowed for automatic execution."
            ),
        )

        db.commit()

        return {
            "success": False,
            "message": "Recovery action is not allowed.",
            "case_id": case.id,
            "status": case.recovery_status,
        }

    # ---------------------------------------------------------
    # 3. BOUNDED RETRY STOPPING RULE
    # ---------------------------------------------------------

    if (
        case.recommended_action == "retry_payment"
        and case.retry_count >= 1
    ):
        add_audit(
            db=db,
            case_id=case.id,
            action="STOPPING_RULE",
            status="blocked",
            details=(
                "Maximum automatic retry count reached. "
                "Further retries are blocked."
            ),
        )

        db.commit()

        return {
            "success": False,
            "message": "Stopping rule triggered.",
            "case_id": case.id,
            "status": case.recovery_status,
        }

    # ---------------------------------------------------------
    # 4. EXECUTE RETRY PAYMENT
    # ---------------------------------------------------------

    if case.recommended_action == "retry_payment":
        case.retry_count += 1

        add_audit(
            db=db,
            case_id=case.id,
            action="RETRY_PAYMENT",
            status="executed",
            details=(
                "Automatic payment retry executed "
                "within bounded recovery policy."
            ),
        )

        # Simulated successful recovery for the demo.
        case.recovery_status = "recovered"

        add_audit(
            db=db,
            case_id=case.id,
            action="RECOVERY",
            status="completed",
            details=(
                f"₹{case.amount:,.2f} successfully recovered "
                "through payment retry."
            ),
        )

        execution_message = (
            "Payment retry executed successfully. "
            "Revenue recovered."
        )

        payment_link_url = None
        payment_link_id = None

    # ---------------------------------------------------------
    # 5. EXECUTE PAYMENT LINK RECOVERY
    # ---------------------------------------------------------

    elif case.recommended_action == "send_payment_link":
        # For the buildathon demo, execution of the bounded
        # payment-link recovery action is treated as a
        # successful recovery outcome.
        case.recovery_status = "recovered"

        payment_link_id = (
            f"plink_recoverai_{case.id}"
        )

        payment_link_url = (
            f"https://rzp.io/i/{payment_link_id}"
        )

        add_audit(
            db=db,
            case_id=case.id,
            action="PAYMENT_LINK",
            status="generated",
            details=(
                "Recovery payment link generated "
                "for customer follow-up."
            ),
        )

        add_audit(
            db=db,
            case_id=case.id,
            action="RECOVERY",
            status="completed",
            details=(
                f"₹{case.amount:,.2f} recovery action completed "
                "through payment-link intervention."
            ),
        )

        execution_message = (
            "Payment link generated successfully. "
            "Recovery action completed."
        )

    # ---------------------------------------------------------
    # 6. RECORD STANDARDIZED EXECUTION EVENT
    # ---------------------------------------------------------

    add_audit(
        db=db,
        case_id=case.id,
        action="RECOVERY_EXECUTION",
        status="success",
        details=(
            f"Recovery action '{case.recommended_action}' "
            "executed successfully within policy guardrails."
        ),
    )

    # ---------------------------------------------------------
    # 7. UPDATE CASE
    # ---------------------------------------------------------

    case.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(case)

    # ---------------------------------------------------------
    # 8. RESPONSE
    # ---------------------------------------------------------

    return {
        "success": True,
        "case_id": case.id,
        "payment_id": case.payment_id,
        "action": case.recommended_action,
        "status": case.recovery_status,
        "amount": case.amount,
        "currency": case.currency,
        "payment_link": (
            payment_link_url
            if case.recommended_action == "send_payment_link"
            else None
        ),
        "message": execution_message,
    }