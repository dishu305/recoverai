
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.models import AuditLog, Customer, RecoveryCase
from app.routes.recovery import router as recovery_router
from app.routes.webhook import router as webhook_router
from app.routes.dashboard import router as dashboard_router


app = FastAPI(
    title="RecoverAI",
    description="AI-powered payment revenue recovery platform",
    version="1.0.0",
)


# Create database tables
Base.metadata.create_all(bind=engine)


# Register API routers
app.include_router(webhook_router)
app.include_router(recovery_router)
app.include_router(dashboard_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "name": "RecoverAI",
        "status": "running",
        "message": "AI Revenue Recovery API is live",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }