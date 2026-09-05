from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RecoveryCase
from app.services.recovery_service import process_payment_failure


router = APIRouter(
    prefix="/webhooks",
    tags=["Webhooks"],
)


def extract_payment_data(payload: dict) -> tuple[str, dict]:
    """
    Normalize either:

    1. A real Razorpay-style payment.failed webhook:

       {
           "event": "payment.failed",
           "payload": {
               "payment": {
                   "entity": {
                       ...
                   }
               }
           }
       }

    2. A simplified raw payment-failure payload used for testing:

       {
           "payment_id": "...",
           "amount": 950000,
           "currency": "INR",
           "customer_email": "...",
           "failure_reason": "..."
       }

    The webhook only extracts raw payment facts.
    AI decisions are NOT supplied by the caller.
    """

    # ---------------------------------------------------------
    # FORMAT 1: REAL RAZORPAY WEBHOOK
    # ---------------------------------------------------------

    event = payload.get("event")

    if event is not None:

        # Ignore events other than payment.failed
        if event != "payment.failed":
            return event, {}

        payment = (
            payload
            .get("payload", {})
            .get("payment", {})
            .get("entity", {})
        )

        if not payment:
            raise HTTPException(
                status_code=400,
                detail="Payment entity missing",
            )

        payment_id = payment.get("id")

        if not payment_id:
            raise HTTPException(
                status_code=400,
                detail="Payment ID missing",
            )

        return event, payment

    # ---------------------------------------------------------
    # FORMAT 2: RAW PAYMENT FAILURE TEST PAYLOAD
    # ---------------------------------------------------------

    payment_id = payload.get("payment_id")

    if payment_id:
        amount = payload.get("amount")
        currency = payload.get("currency")
        customer_email = payload.get("customer_email")
        failure_reason = payload.get("failure_reason")

        if amount is None:
            raise HTTPException(
                status_code=400,
                detail="Amount missing",
            )

        if not currency:
            raise HTTPException(
                status_code=400,
                detail="Currency missing",
            )

        if not customer_email:
            raise HTTPException(
                status_code=400,
                detail="Customer email missing",
            )

        if not failure_reason:
            raise HTTPException(
                status_code=400,
                detail="Failure reason missing",
            )

        # Normalize the simplified test payload into the
        # same payment structure consumed by recovery_service.
        payment = {
            "id": payment_id,
            "amount": amount,
            "currency": currency,
            "email": customer_email,
            "description": failure_reason,
            "error_description": failure_reason,
        }

        return "payment.failed", payment

    # ---------------------------------------------------------
    # UNKNOWN PAYLOAD
    # ---------------------------------------------------------

    raise HTTPException(
        status_code=400,
        detail=(
            "Unsupported webhook payload. Expected either a "
            "Razorpay payment.failed event or raw payment fields: "
            "payment_id, amount, currency, customer_email, "
            "failure_reason."
        ),
    )


@router.post("/razorpay")
async def razorpay_webhook(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
):
    """
    Receive a payment failure event and send only the raw
    payment facts into RecoverAI's recovery decision engine.

    IMPORTANT:
    The caller does NOT provide:
        - risk_score
        - recommended_action
        - ai_reasoning
        - confidence
        - policy_allowed
        - should_execute

    Those decisions belong to RecoverAI.
    """

    # ---------------------------------------------------------
    # 1. NORMALIZE WEBHOOK INPUT
    # ---------------------------------------------------------

    event, payment = extract_payment_data(payload)

    # For non-payment.failed Razorpay events, return ignored.
    if event != "payment.failed":
        return {
            "status": "ignored",
            "event": event,
        }

    # ---------------------------------------------------------
    # 2. EXTRACT PAYMENT ID
    # ---------------------------------------------------------

    payment_id = payment.get("id")

    if not payment_id:
        raise HTTPException(
            status_code=400,
            detail="Payment ID missing",
        )

    # ---------------------------------------------------------
    # 3. IDEMPOTENCY CHECK
    # ---------------------------------------------------------

    existing_case = (
        db.query(RecoveryCase)
        .filter(
            RecoveryCase.payment_id == payment_id
        )
        .first()
    )

    if existing_case:
        return {
            "status": "already_processed",
            "event": event,
            "recovery": {
                "case_id": existing_case.id,
                "payment_id": existing_case.payment_id,
                "status": existing_case.recovery_status,
                "message": "Payment failure already processed",
            },
        }

    # ---------------------------------------------------------
    # 4. SEND RAW PAYMENT FACTS TO RECOVERY ENGINE
    # ---------------------------------------------------------

    # IMPORTANT:
    # No AI decision is supplied here.
    #
    # process_payment_failure() is responsible for:
    #
    # - failure classification
    # - recovery/risk scoring
    # - recommended action
    # - AI reasoning
    # - confidence
    # - guardrails/policy
    # - execution decision
    # - stopping rules
    #
    # depending on what is implemented in recovery_service.py.

    result = process_payment_failure(
        db=db,
        payment=payment,
    )

    # ---------------------------------------------------------
    # 5. RETURN RECOVERY DECISION RESULT
    # ---------------------------------------------------------

    return {
        "status": "processed",
        "event": event,
        "recovery": result,
    }