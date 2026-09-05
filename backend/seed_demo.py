from datetime import datetime, timedelta
import random

from app.database import SessionLocal, Base, engine
from app.models import Customer, RecoveryCase


Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Clear existing demo data
db.query(RecoveryCase).delete()
db.query(Customer).delete()
db.commit()


customers = [
    ("Aarav Sharma", "aarav@acme.com"),
    ("Priya Mehta", "priya@novacorp.com"),
    ("Rahul Verma", "rahul@techflow.com"),
    ("Sneha Kapoor", "sneha@brightlabs.com"),
    ("Aditya Singh", "aditya@scaleup.com"),
    ("Neha Gupta", "neha@cloudworks.com"),
    ("Rohan Malhotra", "rohan@finstack.com"),
    ("Ananya Rao", "ananya@orbitlabs.com"),
    ("Karan Arora", "karan@buildly.com"),
    ("Ishita Jain", "ishita@growthhub.com"),
]

customer_objects = []

for name, email in customers:
    customer = Customer(
        name=name,
        email=email,
    )
    db.add(customer)
    customer_objects.append(customer)

db.commit()

for customer in customer_objects:
    db.refresh(customer)


failure_scenarios = [
    (
        "timeout",
        "Payment failed due to network timeout",
        "retry_payment",
        87,
    ),
    (
        "network",
        "Payment failed due to network error",
        "retry_payment",
        84,
    ),
    (
        "insufficient_funds",
        "Payment failed due to insufficient funds",
        "send_payment_link",
        48,
    ),
    (
        "card_declined",
        "Payment was declined by the issuing bank",
        "send_payment_link",
        62,
    ),
    (
        "timeout",
        "Gateway timeout while processing payment",
        "retry_payment",
        91,
    ),
    (
        "network",
        "Temporary network failure",
        "retry_payment",
        82,
    ),
    (
        "insufficient_funds",
        "Insufficient balance",
        "send_payment_link",
        43,
    ),
    (
        "card_declined",
        "Card transaction declined",
        "send_payment_link",
        59,
    ),
    (
        "timeout",
        "Payment processing timeout",
        "retry_payment",
        89,
    ),
    (
        "network",
        "Network connectivity failure",
        "retry_payment",
        86,
    ),
]


amounts = [
    249900,
    499900,
    129900,
    999900,
    249900,
    749900,
    199900,
    1499900,
    399900,
    599900,
]


for i, customer in enumerate(customer_objects):
    scenario = failure_scenarios[i]

    failure_type = scenario[0]
    failure_reason = scenario[1]
    action = scenario[2]
    score = scenario[3]

    amount = amounts[i]

    # Some cases are already recovered
    if i in [0, 2, 4, 7]:
        status = "recovered"
    elif i in [1, 3, 6]:
        status = "in_progress"
    else:
        status = "pending"

    case = RecoveryCase(
        customer_id=customer.id,
        payment_id=f"pay_demo_{i + 1:03d}",
        customer_email=customer.email,
        amount=amount / 100,
        currency="INR",
        failure_reason=failure_reason,
        risk_score=score,
        recovery_status=status,
        recommended_action=action,
        ai_reasoning=(
            f"Failure classified as {failure_type}. "
            f"Recovery score is {score}/100. "
            f"Recommended action: {action}."
        ),
        created_at=datetime.utcnow()
        - timedelta(hours=random.randint(1, 120)),
    )

    db.add(case)


db.commit()

print("Demo data created successfully.")
print(f"Customers: {db.query(Customer).count()}")
print(f"Recovery cases: {db.query(RecoveryCase).count()}")

db.close()