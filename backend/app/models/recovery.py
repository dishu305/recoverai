from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RecoveryCase(Base):
    __tablename__ = "recovery_cases"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id"),
        index=True,
        nullable=False,
    )

    payment_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
    )

    customer_email: Mapped[str] = mapped_column(
        String(320),
        index=True,
    )

    amount: Mapped[float] = mapped_column(
        Float,
    )

    currency: Mapped[str] = mapped_column(
        String(10),
        default="INR",
    )

    failure_reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    risk_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )

    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )

    recovery_status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
    )

    recommended_action: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    ai_reasoning: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )