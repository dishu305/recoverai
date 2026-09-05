
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export interface DashboardSummary {
  total_failed_payments: number;
  revenue_at_risk: number;
  recoverable_revenue: number;
  recovered_revenue: number;
  recovery_rate: number;
  high_priority_cases: number;

  retry_cases: number;
  payment_link_cases: number;
  manual_review_cases: number;

  executed_actions: number;
  successful_actions: number;
}

export interface RecoveryCase {
  id: number;
  payment_id: string;
  customer_email: string;
  amount: number;
  currency: string;
  failure_reason: string;
  risk_score: number;
  status: string;
  recommended_action: string;
  ai_reasoning: string;
  created_at: string;
}

export interface RecoveryExecutionResult {
  success: boolean;
  case_id: number;
  payment_id?: string;
  action?: string;
  status?: string;
  amount?: number;
  currency?: string;
  payment_link?: string;
  message: string;
}

export interface AuditLog {
  id: number;
  action: string;
  status: string;
  details: string | null;
  created_at: string;
}
export type AuditEvent = AuditLog;

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch(
    `${API_URL}/dashboard/summary`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to load dashboard summary"
    );
  }

  return response.json();
}

export async function getRecoveryCases(): Promise<RecoveryCase[]> {
  const response = await fetch(
    `${API_URL}/dashboard/cases`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to load recovery cases"
    );
  }

  return response.json();
}

export async function executeRecovery(
  caseId: number
): Promise<RecoveryExecutionResult> {
  const response = await fetch(
    `${API_URL}/recovery/cases/${caseId}/execute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to execute recovery"
    );
  }

  return response.json();
}

export async function getRecoveryAudit(
  caseId: number
): Promise<AuditLog[]> {
  const response = await fetch(
    `${API_URL}/recovery/cases/${caseId}/audit`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to load recovery audit"
    );
  }

  return response.json();
}