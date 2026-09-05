"use client";

import React, { useCallback, useEffect, useState } from "react";

import { motion } from "framer-motion";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  DollarSign,
  FileText,
  Filter,
  LayoutDashboard,
  Loader2,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Lightbulb,
  Link2,
  TrendingUp,
  User,
  Wallet,
  ShieldAlert,
  X,
  Zap,
  ArrowDown,
  Target,
} from "lucide-react";

import {
  executeRecovery,
  getDashboardSummary,
  getRecoveryAudit,
  getRecoveryCases,
  type AuditLog,
  type DashboardSummary,
  type RecoveryCase,
} from "@/lib/api";

import {
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const emptySummary: DashboardSummary = {
  total_failed_payments: 0,
  revenue_at_risk: 0,
  recoverable_revenue: 0,
  recovered_revenue: 0,
  recovery_rate: 0,
  high_priority_cases: 0,
  retry_cases: 0,
  payment_link_cases: 0,
  manual_review_cases: 0,
  executed_actions: 0,
  successful_actions: 0,
};

function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string) {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreLabel(score: number) {
  if (score >= 80) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}

function actionLabel(action: string | null) {
  if (action === "retry_payment") {
    return "Retry Payment";
  }

  if (action === "send_payment_link") {
    return "Payment Link";
  }

  if (action === "manual_review") {
    return "Manual Review";
  }

  return "Review";
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = "default",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  accent?: "default" | "success" | "warning" | "danger";
}) {
  const styles = {
    success: {
      card: "border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.10] via-emerald-400/[0.035] to-transparent hover:border-emerald-300/35",
      glow: "bg-emerald-400/[0.12]",
      icon: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.12)]",
      value: "text-emerald-50",
      accent: "bg-emerald-400",
    },
    warning: {
      card: "border-amber-400/20 bg-gradient-to-br from-amber-400/[0.10] via-amber-400/[0.035] to-transparent hover:border-amber-300/35",
      glow: "bg-amber-400/[0.12]",
      icon: "border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.12)]",
      value: "text-amber-50",
      accent: "bg-amber-400",
    },
    danger: {
      card: "border-rose-400/20 bg-gradient-to-br from-rose-400/[0.11] via-rose-400/[0.035] to-transparent hover:border-rose-300/35",
      glow: "bg-rose-400/[0.13]",
      icon: "border-rose-400/30 bg-rose-400/10 text-rose-300 shadow-[0_0_25px_rgba(251,113,133,0.14)]",
      value: "text-rose-50",
      accent: "bg-rose-400",
    },
    default: {
      card: "border-violet-400/20 bg-gradient-to-br from-violet-400/[0.09] via-cyan-400/[0.025] to-transparent hover:border-violet-300/35",
      glow: "bg-violet-400/[0.12]",
      icon: "border-violet-400/30 bg-violet-400/10 text-violet-300 shadow-[0_0_25px_rgba(167,139,250,0.14)]",
      value: "text-violet-50",
      accent: "bg-violet-400",
    },
  }[accent];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${styles.card}`}
    >
      {/* Ambient glow */}
      <div
        className={`absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl transition-all duration-500 group-hover:scale-125 group-hover:opacity-100 ${styles.glow}`}
      />

      {/* Top accent line */}
      <div
        className={`absolute left-5 right-5 top-0 h-px opacity-50 ${styles.accent}`}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              {title}
            </p>

            <p
              className={`mt-3 text-2xl font-bold tracking-tight ${styles.value}`}
            >
              {value}
            </p>

            <p className="mt-1.5 text-xs text-zinc-500">{subtitle}</p>
          </div>

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${styles.icon}`}
          >
            {icon}
          </div>
        </div>

        {/* Bottom indicator */}
        <div className="mt-5 flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${styles.accent}`} />

          <div className="h-px flex-1 bg-white/[0.06]" />

          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            Live
          </span>
        </div>
      </div>
    </div>
  );
}

function DecisionScorecard({ item }: { item: RecoveryCase }) {
  const score = Math.max(0, Math.min(100, item.risk_score));

  const confidence =
    score >= 80
      ? {
          label: "High confidence",
          text: "text-emerald-300",
          border: "border-emerald-400/20",
          bg: "bg-emerald-400/[0.06]",
          bar: "bg-emerald-400",
        }
      : score >= 60
        ? {
            label: "Moderate confidence",
            text: "text-amber-300",
            border: "border-amber-400/20",
            bg: "bg-amber-400/[0.06]",
            bar: "bg-amber-400",
          }
        : {
            label: "Low confidence",
            text: "text-rose-300",
            border: "border-rose-400/20",
            bg: "bg-rose-400/[0.06]",
            bar: "bg-rose-400",
          };

  const action = actionLabel(item.recommended_action);

  const explanation =
    item.recommended_action === "retry_payment"
      ? "Retry is preferred because this failure appears suitable for a controlled re-attempt."
      : item.recommended_action === "send_payment_link"
        ? "A payment link is preferred to give the customer another payment path without automatically retrying."
        : "Manual review is preferred because automated recovery confidence is insufficient.";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            AI Decision Scorecard
          </p>

          <p className="mt-1 text-sm font-medium text-white">
            Why RecoverAI chose this action
          </p>
        </div>

        <div
          className={`rounded-full border px-3 py-1.5 text-[10px] font-medium ${confidence.border} ${confidence.bg} ${confidence.text}`}
        >
          {confidence.label}
        </div>
      </div>

      {/* Main decision */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              Recommended action
            </p>

            <p className="mt-2 text-lg font-semibold text-white">{action}</p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.06]">
            <Brain size={18} className="text-violet-300" />
          </div>
        </div>

        <p className="mt-4 text-xs leading-6 text-zinc-500">{explanation}</p>
      </div>

      {/* Confidence */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              Recovery confidence
            </p>

            <p className={`mt-1 text-2xl font-semibold ${confidence.text}`}>
              {score}%
            </p>
          </div>

          <Target size={18} className="text-zinc-600" />
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className={`h-full rounded-full transition-all duration-700 ${confidence.bar}`}
            style={{ width: `${score}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-[9px] text-zinc-700">
          <span>Low</span>
          <span>Moderate</span>
          <span>High</span>
        </div>
      </div>

      {/* Decision factors */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
            Failure signal
          </p>

          <p className="mt-2 text-xs text-zinc-400">{item.failure_reason}</p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
            Revenue at risk
          </p>

          <p className="mt-2 text-xs font-medium text-white">
            ₹{Number(item.amount).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Bounded execution */}
      <div className="flex items-start gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.025] p-3">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-cyan-300" />

        <div>
          <p className="text-[10px] font-medium text-cyan-300">
            Bounded execution
          </p>

          <p className="mt-1 text-[10px] leading-5 text-zinc-600">
            The recommended action is executed only within RecoverAI&apos;s
            configured recovery policy and remains fully auditable.
          </p>
        </div>
      </div>
    </div>
  );
}

function RecoveryDrawer({
  item,
  onClose,
  onExecutionStart,
  onExecuted,
}: {
  item: RecoveryCase | null;
  onClose: () => void;
  onExecutionStart: () => void;
  onExecuted: () => void;
}) {
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [auditIndicatesRecovered, setAuditIndicatesRecovered] = useState(false);

  useEffect(() => {
    if (!item) return;

    let cancelled = false;

    const loadAudit = async () => {
      try {
        setLoadingAudit(true);

        const data = await getRecoveryAudit(item.id);

        if (!cancelled) {
          setAudit(data);
          setAuditIndicatesRecovered(
            data.some(
              (event) =>
                event.status === "success" &&
                ["RECOVERY", "RECOVERY_EXECUTION"].includes(event.action),
            ) ||
              data.some((event) =>
                /already recovered|already been recovered|recovered/i.test(
                  event.details || "",
                ),
              ),
          );
          setMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Failed to load audit history",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingAudit(false);
        }
      }
    };

    loadAudit();

    return () => {
      cancelled = true;
    };
  }, [item]);

  if (!item) return null;

  async function handleExecute() {
    try {
      setExecuting(true);
      onExecutionStart();
      setMessage("");

      const result = await executeRecovery(item!.id);

      setPaymentLink(result.payment_link || "");

      setMessage(result.message || "Recovery action executed successfully.");

      onExecuted();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Recovery execution failed.",
      );
    } finally {
      setExecuting(false);
    }
  }

  const isRecovered =
    item.status === "recovered" || auditIndicatesRecovered;
  const isHighRisk = item.risk_score >= 80;
  const isMediumRisk = item.risk_score >= 50 && item.risk_score < 80;

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-white/[0.08] bg-[#0b0b0f] shadow-2xl shadow-black"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-[#0b0b0f]/90 px-6 py-5 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                AI Recovery Agent
              </p>
            </div>

            <h2 className="mt-2 text-lg font-semibold text-white">
              Recovery Case #{item.id}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-white/[0.08] p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Revenue opportunity */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/[0.07] via-white/[0.025] to-transparent p-6"
          >
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-400/[0.06] blur-3xl" />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                  Revenue opportunity
                </p>

                <p className="mt-2 text-3xl font-semibold text-white">
                  {formatCurrency(item.amount, item.currency)}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Payment currently at risk
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.06] text-cyan-300">
                <Wallet size={22} />
              </div>
            </div>

            <div className="relative mt-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                  Recovery confidence
                </span>

                <span
                  className={`text-sm font-bold ${
                    isHighRisk
                      ? "text-rose-300"
                      : isMediumRisk
                        ? "text-amber-300"
                        : "text-cyan-300"
                  }`}
                >
                  {item.risk_score}%
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(item.risk_score, 100)}%`,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: "easeOut",
                  }}
                  className={`h-full rounded-full ${
                    isHighRisk
                      ? "bg-rose-400"
                      : isMediumRisk
                        ? "bg-amber-400"
                        : "bg-cyan-400"
                  }`}
                />
              </div>

              <div className="mt-2 flex justify-between text-[9px] text-zinc-700">
                <span>Low</span>
                <span>Moderate</span>
                <span>High</span>
              </div>
            </div>
          </motion.div>

          {/* Customer / Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">
                Customer
              </p>

              <p className="mt-2 truncate text-sm font-medium text-white">
                {item.customer_email}
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">
                Payment
              </p>

              <p className="mt-2 truncate text-sm font-medium text-white">
                {item.payment_id}
              </p>
            </div>
          </div>

          {/* AI Decision */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain size={17} className="text-cyan-300" />

                <h3 className="font-medium text-white">AI Decision</h3>
              </div>

              <span className="rounded-full border border-cyan-400/10 bg-cyan-400/[0.05] px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-cyan-300">
                Autonomous
              </span>
            </div>

            <div className="space-y-4">
              <DecisionScorecard item={item} />

              <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.035] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10">
                    <Sparkles size={16} className="text-cyan-300" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                      Agent reasoning
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                      Decision generated from payment failure signals, recovery
                      probability, and execution policy.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-zinc-600">
                      Risk
                    </p>

                    <p className="mt-1 text-sm font-semibold text-white">
                      {item.risk_score}/100
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-zinc-600">
                      Action
                    </p>

                    <p className="mt-1 truncate text-sm font-semibold text-white">
                      {actionLabel(item.recommended_action)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-zinc-600">
                      Mode
                    </p>

                    <p className="mt-1 text-sm font-semibold text-emerald-300">
                      Guardrailed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Audit Trail */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={17} className="text-zinc-300" />

                <h3 className="font-medium text-white">Audit Trail</h3>
              </div>

              <span className="text-[9px] uppercase tracking-[0.15em] text-zinc-600">
                Immutable log
              </span>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
              {loadingAudit ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 size={16} className="animate-spin" />
                  Loading audit events...
                </div>
              ) : audit.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No audit events available yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {audit.map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                        <CheckCircle2 size={14} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-white">
                            {event.action}
                          </p>

                          <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2 py-0.5 text-[9px] uppercase tracking-wider text-zinc-600">
                            {event.status}
                          </span>
                        </div>

                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          {event.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Execution result */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <CheckCircle2 size={16} />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                    Recovery execution
                  </p>

                  <p className="mt-2 text-sm leading-5 text-zinc-300">
                    {message}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Payment link */}
          {paymentLink && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.035] p-5"
            >
              <div className="flex items-center gap-2">
                <Link2 size={15} className="text-cyan-300" />

                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300">
                  Payment Link Generated
                </p>
              </div>

              <p className="mt-3 break-all rounded-lg border border-white/[0.06] bg-black/20 p-3 text-xs text-zinc-500">
                {paymentLink}
              </p>

              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Open Payment Link
                <ArrowUpRight size={15} />
              </a>
            </motion.div>
          )}

          {/* Execute */}
          {!isRecovered && !executing && (
            <div className="sticky bottom-0 border-t border-white/[0.06] bg-[#0b0b0f]/95 pt-4 backdrop-blur-xl">
              <button
                onClick={handleExecute}
                disabled={executing}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {executing ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Executing Recovery...
                  </>
                ) : (
                  <>
                    <Zap size={17} />
                    Execute Recovery
                  </>
                )}
              </button>

              <p className="mt-2 text-center text-[9px] uppercase tracking-[0.15em] text-zinc-700">
                Bounded action · Audit logged
              </p>
            </div>
          )}

          {isRecovered && (
            <div className="space-y-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-300">
                <CheckCircle2 size={17} />
                Revenue successfully recovered
              </div>
              <p className="text-center text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                Recovery action locked · audit confirms completion
              </p>
            </div>
          )}
        </div>
      </motion.aside>
    </div>
  );
}

function RecoveryHero({ summary }: { summary: DashboardSummary }) {
  const aiOpportunities = summary.retry_cases + summary.payment_link_cases;

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        ease: "easeOut",
      }}
      className="relative mb-10 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] px-6 py-10 md:px-10 md:py-14"
    >
      {/* Ambient animated glows */}
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-[110px]"
      />

      <motion.div
        animate={{
          scale: [1.08, 1, 1.08],
          opacity: [0.15, 0.28, 0.15],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px]"
      />

      <div className="relative z-10">
        {/* Engine status */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[0.05] px-3 py-1.5"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
          </span>

          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
            AI Revenue Recovery Engine
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.2,
            duration: 0.7,
          }}
          className="max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-white md:text-6xl"
        >
          Turn failed payments into{" "}
          <span className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
            recovered revenue.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.32,
            duration: 0.6,
          }}
          className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400 md:text-base"
        >
          RecoverAI detects revenue at risk, chooses the safest recovery
          intervention, executes within strict controls, and records every
          decision for auditability.
        </motion.p>

        {/* AI pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.42,
            duration: 0.6,
          }}
          className="mt-8 flex flex-wrap items-center gap-2"
        >
          {[
            {
              label: "Detect",
              icon: Search,
            },
            {
              label: "Decide",
              icon: Brain,
            },
            {
              label: "Recover",
              icon: Zap,
            },
            {
              label: "Audit",
              icon: ShieldCheck,
            },
          ].map((step, index) => (
            <React.Fragment key={step.label}>
              <motion.div
                whileHover={{
                  y: -3,
                  scale: 1.04,
                }}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-2.5 text-xs font-medium text-zinc-300 backdrop-blur-xl"
              >
                <step.icon size={14} className="text-cyan-300" />
                {step.label}
              </motion.div>

              {index < 3 && (
                <span className="hidden text-zinc-700 sm:block">→</span>
              )}
            </React.Fragment>
          ))}
        </motion.div>

        {/* Live numbers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.55,
            duration: 0.7,
          }}
          className="mt-10 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <motion.div
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-2xl border border-rose-400/10 bg-rose-400/[0.035] p-5 transition hover:border-rose-400/25"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-rose-400/[0.08] blur-2xl transition group-hover:scale-125" />

            <div className="relative">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Revenue at risk
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-rose-100">
                {formatCurrency(summary.revenue_at_risk)}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Failed payment exposure
              </p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.035] p-5 transition hover:border-cyan-400/25"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-cyan-400/[0.08] blur-2xl transition group-hover:scale-125" />

            <div className="relative">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                AI opportunities
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-cyan-100">
                {aiOpportunities}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Automated recovery candidates
              </p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-5 transition hover:border-emerald-400/30"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-emerald-400/[0.10] blur-2xl transition group-hover:scale-125" />

            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/60">
                  Revenue recovered
                </p>

                <CheckCircle2 size={15} className="text-emerald-300" />
              </div>

              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-100">
                {formatCurrency(summary.recovered_revenue)}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Successfully recovered
              </p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-2xl border border-violet-400/10 bg-violet-400/[0.035] p-5 transition hover:border-violet-400/25"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-violet-400/[0.08] blur-2xl transition group-hover:scale-125" />

            <div className="relative">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Recovery rate
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-violet-100">
                {summary.recovery_rate.toFixed(1)}%
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Revenue successfully recovered
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          animate={{
            y: [0, 6, 0],
            opacity: [0.45, 0.8, 0.45],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="mt-10 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600"
        >
          <span>Scroll to investigate</span>
          <ArrowDown size={13} />
        </motion.div>
      </div>
    </motion.section>
  );
}


function RecoveryStory({ summary }: { summary: DashboardSummary }) {
  const [activeStage, setActiveStage] = useState(0);

  const stages = [
    {
      number: "01",
      label: "Detect",
      kicker: "Revenue at risk",
      title: "Find the money before it disappears.",
      description:
        "RecoverAI continuously surfaces failed payments with meaningful recovery potential instead of treating every failure the same.",
      metric: formatCurrency(summary.revenue_at_risk),
      metricLabel: "revenue currently at risk",
      icon: Search,
      accent: "cyan",
    },
    {
      number: "02",
      label: "Decide",
      kicker: "AI recovery agent",
      title: "Choose the safest intervention.",
      description:
        "The agent evaluates payment context, recovery signals, and policy boundaries before selecting retry, payment link, or review.",
      metric: String(summary.retry_cases + summary.payment_link_cases),
      metricLabel: "AI recovery opportunities",
      icon: Brain,
      accent: "violet",
    },
    {
      number: "03",
      label: "Recover",
      kicker: "Bounded execution",
      title: "Turn a decision into recovered revenue.",
      description:
        "Approved actions execute within strict controls, creating a measurable recovery outcome without uncontrolled retries or actions.",
      metric: formatCurrency(summary.recovered_revenue),
      metricLabel: "revenue recovered",
      icon: Zap,
      accent: "emerald",
    },
    {
      number: "04",
      label: "Audit",
      kicker: "Accountable automation",
      title: "Make every decision explainable.",
      description:
        "Every intervention leaves an audit trail so teams can understand what the agent decided, what it executed, and what happened next.",
      metric: `${summary.successful_actions}/${summary.executed_actions}`,
      metricLabel: "successful audited executions",
      icon: ShieldCheck,
      accent: "amber",
    },
  ];

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    stages.forEach((_, index) => {
      const element = document.getElementById(`recovery-story-${index}`);
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveStage(index);
        },
        { threshold: 0.55 },
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, [stages.length]);

  const active = stages[activeStage];
  const accentMap = {
    cyan: {
      text: "text-cyan-300",
      soft: "bg-cyan-400/[0.08]",
      border: "border-cyan-400/20",
      glow: "bg-cyan-400/[0.08]",
      line: "from-transparent via-cyan-300/70 to-transparent",
    },
    violet: {
      text: "text-violet-300",
      soft: "bg-violet-400/[0.08]",
      border: "border-violet-400/20",
      glow: "bg-violet-400/[0.08]",
      line: "from-transparent via-violet-300/70 to-transparent",
    },
    emerald: {
      text: "text-emerald-300",
      soft: "bg-emerald-400/[0.08]",
      border: "border-emerald-400/20",
      glow: "bg-emerald-400/[0.08]",
      line: "from-transparent via-emerald-300/70 to-transparent",
    },
    amber: {
      text: "text-amber-300",
      soft: "bg-amber-400/[0.08]",
      border: "border-amber-400/20",
      glow: "bg-amber-400/[0.08]",
      line: "from-transparent via-amber-300/70 to-transparent",
    },
  } as const;

  const colors = accentMap[active.accent as keyof typeof accentMap];

  return (
    <section className="relative mb-12 overflow-hidden rounded-3xl border border-white/[0.07] bg-black/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.045),transparent_42%)]" />

      <div className="relative grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="border-b border-white/[0.06] p-6 lg:sticky lg:top-6 lg:h-fit lg:self-start lg:border-b-0 lg:border-r lg:p-8">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl border ${colors.border} ${colors.soft}`}>
              <Activity size={15} className={colors.text} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                The recovery loop
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Scroll through the agent lifecycle
              </p>
            </div>
          </div>

          <div className="mt-8 hidden lg:block">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const isActive = index === activeStage;
              return (
                <div key={stage.label} className="relative flex gap-4">
                  {index < stages.length - 1 && (
                    <div className="absolute left-4 top-9 h-12 w-px bg-white/[0.07]" />
                  )}
                  <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-500 ${isActive ? `${colors.border} ${colors.soft} ${colors.text}` : "border-white/[0.07] bg-white/[0.02] text-zinc-700"}`}>
                    <Icon size={14} />
                  </div>
                  <div className="pb-8">
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${isActive ? colors.text : "text-zinc-700"}`}>
                      {stage.number} · {stage.label}
                    </p>
                    <p className={`mt-1 text-xs transition-colors ${isActive ? "text-zinc-300" : "text-zinc-700"}`}>
                      {stage.kicker}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 lg:block">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.15em] text-zinc-700">
                Live stage
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${colors.text}`}>
                {active.label}
              </span>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                animate={{ width: `${((activeStage + 1) / stages.length) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`h-full rounded-full bg-gradient-to-r ${colors.line}`}
              />
            </div>
          </div>
        </div>

        <div className="relative px-5 py-4 md:px-8 lg:px-12">
          <div className="sticky top-5 z-10 mb-3 lg:hidden">
            <div className="flex items-center justify-between rounded-full border border-white/[0.07] bg-[#0a0a0d]/85 px-3 py-2 backdrop-blur-xl">
              <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                Agent stage
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${colors.text}`}>
                {active.number} · {active.label}
              </span>
            </div>
          </div>

          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === activeStage;
            return (
              <div
                id={`recovery-story-${index}`}
                key={stage.label}
                className="flex min-h-[68vh] items-center py-8 md:min-h-[62vh]"
              >
                <motion.div
                  animate={{
                    opacity: isActive ? 1 : 0.38,
                    scale: isActive ? 1 : 0.97,
                    y: isActive ? 0 : 10,
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-full"
                >
                  <div className="mb-6 flex items-center gap-3">
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${isActive ? colors.text : "text-zinc-700"}`}>
                      {stage.number}
                    </span>
                    <div className="h-px flex-1 bg-white/[0.06]" />
                    <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-700">
                      {stage.kicker}
                    </span>
                  </div>

                  <div className={`relative overflow-hidden rounded-3xl border p-6 md:p-9 transition-colors duration-500 ${isActive ? `${colors.border} bg-white/[0.035]` : "border-white/[0.05] bg-white/[0.015]"}`}>
                    <div className={`pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full ${colors.glow} blur-[90px]`} />
                    <div className="relative">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${colors.border} ${colors.soft} ${colors.text}`}>
                        <Icon size={20} />
                      </div>

                      <h3 className="mt-7 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-white md:text-5xl">
                        {stage.title}
                      </h3>

                      <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-500 md:text-base">
                        {stage.description}
                      </p>

                      <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
                        <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                          <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-700">
                            Current signal
                          </p>
                          <p className={`mt-2 text-2xl font-semibold tracking-tight ${colors.text}`}>
                            {stage.metric}
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-600">
                            {stage.metricLabel}
                          </p>
                        </div>
                        <div className="flex items-end rounded-2xl border border-white/[0.06] bg-black/20 p-4 sm:min-w-40">
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-700">
                              Agent principle
                            </p>
                            <p className="mt-2 text-xs font-medium text-zinc-300">
                              {index === 0
                                ? "Prioritize opportunity"
                                : index === 1
                                  ? "Explain before acting"
                                  : index === 2
                                    ? "Act within policy"
                                    : "Prove the outcome"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);

  const [cases, setCases] = useState<RecoveryCase[]>([]);

  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("all");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [mobileMenu, setMobileMenu] = useState(false);

  const [activePipelineStage, setActivePipelineStage] = useState<
    "detect" | "decide" | "recover" | "audit"
  >("detect");

  const loadDashboard = useCallback(async () => {
    try {
      setError("");

      const [summaryData, casesData] = await Promise.all([
        getDashboardSummary(),
        getRecoveryCases(),
      ]);

      setSummary(summaryData);
      setCases(casesData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to RecoverAI backend.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadDashboard]);

  const recoveryPotential =
    summary.revenue_at_risk > 0
      ? Math.min(
          100,
          (summary.recoverable_revenue / summary.revenue_at_risk) * 100,
        )
      : 0;

  const executionSuccessRate =
    summary.executed_actions > 0
      ? Math.min(
          100,
          (summary.successful_actions / summary.executed_actions) * 100,
        )
      : 0;

  const actionData = [
    {
      name: "Retry",
      value: summary.retry_cases,
      fill: "#22d3ee",
    },
    {
      name: "Payment Link",
      value: summary.payment_link_cases,
      fill: "#8b5cf6",
    },
    {
      name: "Manual Review",
      value: summary.manual_review_cases,
      fill: "#f59e0b",
    },
  ].filter((item) => item.value > 0);

  const revenueData = [
    {
      name: "At Risk",
      amount: summary.revenue_at_risk,
    },
    {
      name: "Recoverable",
      amount: summary.recoverable_revenue,
    },
    {
      name: "Recovered",
      amount: summary.recovered_revenue,
    },
  ];

  const filteredCases = cases.filter((item) => {
    const query = search.toLowerCase();

    const matchesSearch =
      !query ||
      item.customer_email.toLowerCase().includes(query) ||
      item.payment_id.toLowerCase().includes(query) ||
      (item.failure_reason || "").toLowerCase().includes(query);

    const matchesFilter =
      filter === "all" ||
      (filter === "high" && item.risk_score >= 80) ||
      (filter === "retry" && item.recommended_action === "retry_payment") ||
      (filter === "link" && item.recommended_action === "send_payment_link") ||
      (filter === "recovered" && item.status === "recovered");

    return matchesSearch && matchesFilter;
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070709] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[-15%] h-[420px] w-[420px] rounded-full bg-violet-500/[0.055] blur-[120px]" />

        <div className="absolute right-[-10%] top-[20%] h-[500px] w-[500px] rounded-full bg-cyan-400/[0.045] blur-[140px]" />

        <div className="absolute left-[45%] top-[55%] h-[360px] w-[360px] rounded-full bg-emerald-400/[0.025] blur-[130px]" />
      </div>
      <div className="relative flex min-h-screen">
        {mobileMenu && (
          <button
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setMobileMenu(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-white/[0.07] bg-[#09090c]/95 p-5 backdrop-blur-xl transition-transform lg:static lg:translate-x-0 ${
            mobileMenu ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
              <Sparkles size={18} />
            </div>

            <div>
              <p className="font-semibold tracking-tight">RecoverAI</p>

              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                Revenue Intelligence
              </p>
            </div>
          </div>

          <nav className="mt-10 space-y-1">
            {[
              {
                icon: LayoutDashboard,
                label: "Overview",
                active: true,
              },
              {
                icon: AlertTriangle,
                label: "Recovery Queue",
                target: "recovery",
              },
              {
                icon: TrendingUp,
                label: "Analytics",
                target: "analytics",
              },
              {
                icon: FileText,
                label: "Audit Trail",
                target: "audit",
              },
            ].map((nav) => (
              <button
                key={nav.label}
                onClick={() => {
                  if (nav.target) {
                    document.getElementById(nav.target)?.scrollIntoView({
                      behavior: "smooth",
                    });
                  }
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  nav.active
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
              >
                <nav.icon size={17} />
                {nav.label}
              </button>
            ))}
          </nav>

          <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

              <span className="text-xs font-medium text-zinc-300">
                System operational
              </span>
            </div>

            <p className="mt-2 text-[11px] leading-5 text-zinc-600">
              AI recovery engine, policy guardrails and audit logging are
              active.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 overflow-x-hidden">
          <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#070709]/80 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between px-5 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.05] lg:hidden"
                  onClick={() => setMobileMenu(true)}
                >
                  <Menu size={20} />
                </button>

                <div>
                  <p className="text-sm font-medium text-white">
                    Revenue Recovery Command Center
                  </p>

                  <p className="hidden text-xs text-zinc-600 sm:block">
                    Detect · Decide · Recover · Audit
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                  <span className="text-xs text-emerald-400">
                    AI Engine Online
                  </span>
                </div>

                <button
                  onClick={loadDashboard}
                  className="rounded-xl border border-white/[0.08] p-2 text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
                  title="Refresh dashboard"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          </header>

         <div className="mx-auto min-w-0 max-w-[1500px] overflow-x-hidden p-5 lg:p-8">
            <div className="relative mb-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 lg:p-8">
              {/* Ambient glow */}
              <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/[0.06] blur-[100px]" />
              <div className="pointer-events-none absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-violet-500/[0.06] blur-[100px]" />

              <div className="relative">
               <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
                 <div className="min-w-0 max-w-3xl">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07]">
                        <Activity size={16} className="text-cyan-300" />
                      </div>

                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-300/80">
                          Live recovery intelligence
                        </p>

                        <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                          Detect · Decide · Recover · Audit
                        </p>
                      </div>
                    </div>

                    <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-white lg:text-6xl">
                      Turn failed payments into{" "}
                      <span className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
                        recovered revenue.
                      </span>
                    </h1>

                    <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400 lg:text-base">
                      RecoverAI detects payment failures, reasons about the
                      recovery opportunity, applies bounded policies and
                      executes the safest next action.
                    </p>

                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                        <span className="text-[11px] font-medium text-emerald-300">
                          Recovery engine active
                        </span>
                      </div>

                      <div className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[11px] text-zinc-500">
                        AI decisioning enabled
                      </div>

                      <div className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[11px] text-zinc-500">
                        Bounded execution
                      </div>
                    </div>
                  </div>

                  <div className="w-full min-w-0">
                    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 backdrop-blur-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                            Recovery actions
                          </p>

                          <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                            {summary.successful_actions}/
                            {summary.executed_actions}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            successful executions
                          </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.06]">
                          <Brain size={18} className="text-violet-300" />
                        </div>
                      </div>

                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-700"
                          style={{
                            width:
                              summary.executed_actions > 0
                                ? `${Math.min(
                                    100,
                                    (summary.successful_actions /
                                      summary.executed_actions) *
                                      100,
                                  )}%`
                                : "0%",
                          }}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[10px]">
                        <span className="text-zinc-600">Execution health</span>
                        <span className="text-zinc-400">
                          {summary.executed_actions > 0
                            ? `${Math.round(
                                (summary.successful_actions /
                                  summary.executed_actions) *
                                  100,
                              )}%`
                            : "0%"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recovery pipeline */}
                {/* Recovery pipeline — cinematic agent flow */}
                <div className="relative mt-8 overflow-hidden rounded-2xl border border-white/[0.07] bg-black/20 p-4 md:p-5">
                  {/* Background energy */}
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-[8%] top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-cyan-400/[0.05] blur-[70px]" />
                    <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/[0.05] blur-[70px]" />
                    <div className="absolute right-[8%] top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-emerald-400/[0.05] blur-[70px]" />
                  </div>

                  <div className="relative">
                    {/* Header */}
                    <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">
                          Autonomous recovery loop
                        </p>

                        <p className="mt-1 text-sm font-medium text-white">
                          From payment signal to audited outcome
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />

                        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-emerald-400">
                          Agent active
                        </span>
                      </div>
                    </div>

                    {/* Flow */}
                    <div className="grid gap-2 md:grid-cols-[1fr_36px_1fr_36px_1fr_36px_1fr] md:items-center">
                      {[
                        {
                          id: "detect",
                          number: "01",
                          label: "Detect",
                          icon: Search,
                          text: "Find revenue at risk",
                          detail:
                            "Continuously identify payments showing recovery risk.",
                        },
                        {
                          id: "decide",
                          number: "02",
                          label: "Decide",
                          icon: Brain,
                          text: "Choose safest action",
                          detail:
                            "AI evaluates risk, context, and the best recovery strategy.",
                        },
                        {
                          id: "recover",
                          number: "03",
                          label: "Recover",
                          icon: Zap,
                          text: "Execute bounded policy",
                          detail:
                            "Apply a controlled intervention within defined guardrails.",
                        },
                        {
                          id: "audit",
                          number: "04",
                          label: "Audit",
                          icon: ShieldCheck,
                          text: "Track every outcome",
                          detail:
                            "Record decisions, actions, and recovery results.",
                        },
                      ].map((stage, index) => {
                        const Icon = stage.icon;
                        const isActive = activePipelineStage === stage.id;
                        const colorClasses = {
                          Detect: {
                            icon: "text-cyan-400",
                            bg: "bg-cyan-400/10",
                            border: "border-cyan-400/20",
                            glow: "bg-cyan-400/[0.08]",
                          },
                          Decide: {
                            icon: "text-violet-400",
                            bg: "bg-violet-400/10",
                            border: "border-violet-400/20",
                            glow: "bg-violet-400/[0.08]",
                          },
                          Recover: {
                            icon: "text-emerald-400",
                            bg: "bg-emerald-400/10",
                            border: "border-emerald-400/20",
                            glow: "bg-emerald-400/[0.08]",
                          },
                          Audit: {
                            icon: "text-amber-400",
                            bg: "bg-amber-400/10",
                            border: "border-amber-400/20",
                            glow: "bg-amber-400/[0.08]",
                          },
                        }[stage.label] ?? {
                          icon: "text-white",
                          bg: "bg-white/10",
                          border: "border-white/10",
                          glow: "bg-white",
                        };

                        return (
                          <React.Fragment key={stage.label}>
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true, amount: 0.4 }}
                              transition={{
                                duration: 0.45,
                                delay: index * 0.12,
                              }}
                              className={`group relative rounded-2xl border p-4 transition-all duration-500 ${
                                isActive
                                  ? `scale-[1.03] ${colorClasses.border} ${colorClasses.bg} shadow-[0_0_30px_rgba(255,255,255,0.08)]`
                                  : "border-white/[0.07] bg-white/[0.025]"
                              } hover:-translate-y-0.5`}
                            >
                              {/* Stage number */}
                              <div className="absolute right-3 top-3 text-[9px] font-medium tracking-[0.15em] text-zinc-700">
                                {stage.number}
                              </div>

                              <div className="flex items-start gap-3">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${colorClasses.border} ${colorClasses.bg} ${colorClasses.icon} ${
                                    isActive
                                      ? "scale-110 ring-2 ring-white/20"
                                      : ""
                                  }`}
                                >
                                  {" "}
                                  <Icon size={17} />
                                </div>

                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-white">
                                    {stage.label}
                                  </p>

                                  <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                                    {stage.text}
                                  </p>

                                  <div className="mt-3 flex items-center gap-1.5">
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${index < 3 ? "bg-emerald-400" : "bg-blue-400"} animate-pulse`}
                                    />

                                    <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                                      {stage.detail}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Active scan line */}
                              <motion.div
                                initial={{ x: "-100%" }}
                                whileInView={{ x: "200%" }}
                                viewport={{ once: false, amount: 0.5 }}
                                transition={{
                                  duration: 1.8,
                                  delay: index * 0.35,
                                  repeat: Infinity,
                                  repeatDelay: 4,
                                  ease: "easeInOut",
                                }}
                                className="pointer-events-none absolute bottom-0 left-0 h-px w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                              />
                            </motion.div>

                            {/* Connector */}
                            {index < 3 && (
                              <div className="hidden h-8 items-center justify-center md:flex">
                                <div className="relative h-px w-full overflow-hidden bg-white/[0.08]">
                                  <motion.div
                                    initial={{ x: "-100%" }}
                                    whileInView={{ x: "200%" }}
                                    viewport={{ once: false, amount: 0.5 }}
                                    transition={{
                                      duration: 1.4,
                                      delay: 0.5 + index * 0.35,
                                      repeat: Infinity,
                                      repeatDelay: 3.5,
                                      ease: "linear",
                                    }}
                                    className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"
                                  />
                                </div>

                                <span className="absolute text-[13px] text-zinc-700">
                                  →
                                </span>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Bottom status */}
                    <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Activity size={13} className="text-cyan-300" />

                        <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                          Continuous recovery intelligence
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-600">
                        <span>Policy controlled</span>
                        <span className="text-zinc-800">•</span>
                        <span>Human-safe</span>
                        <span className="text-zinc-800">•</span>
                        <span>Fully auditable</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SCROLL STORY — product narrative without hijacking native scroll */}
                <RecoveryStory summary={summary} />

                {/* AI INTELLIGENCE */}
                <section className="mt-10">
                  <div className="mb-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300">
                        <Brain size={16} />
                      </div>

                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          AI Intelligence
                        </h2>

                        <p className="mt-0.5 text-xs text-zinc-600">
                          How RecoverAI is converting payment failures into
                          revenue.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid min-w-0 gap-4 xl:grid-cols-3">
                    {/* RECOVERY FUNNEL */}
<motion.div
  initial={{ opacity: 0, y: 18 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.2 }}
  transition={{ duration: 0.6 }}
  whileHover={{ y: -3 }}
  className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-all duration-300 hover:border-cyan-400/20 hover:bg-white/[0.035]"
>
  <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-cyan-400/[0.06] blur-3xl transition-transform duration-500 group-hover:scale-125" />

  <div className="relative">
    <div className="mb-5 flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.07]">
            <Activity size={15} className="text-cyan-300" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">
              Recovery Funnel
            </h3>
            <p className="mt-0.5 text-[10px] text-zinc-600">
              From failure to recovered revenue
            </p>
          </div>
        </div>
      </div>

      <span className="rounded-full border border-cyan-400/10 bg-cyan-400/[0.05] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-300/70">
        Live
      </span>
    </div>

    <div className="space-y-4">
      {[
        {
          label: "Failed Payments",
          value: summary.total_failed_payments,
          percent: 100,
          icon: AlertTriangle,
          tone: "text-rose-300",
          bar: "bg-rose-400",
        },
        {
          label: "Recoverable",
          value: summary.retry_cases + summary.payment_link_cases,
          percent:
            summary.total_failed_payments > 0
              ? ((summary.retry_cases + summary.payment_link_cases) /
                  summary.total_failed_payments) *
                100
              : 0,
          icon: Target,
          tone: "text-cyan-300",
          bar: "bg-cyan-400",
        },
        {
          label: "Actions Executed",
          value: summary.executed_actions,
          percent:
            summary.total_failed_payments > 0
              ? (summary.executed_actions /
                  summary.total_failed_payments) *
                100
              : 0,
          icon: Zap,
          tone: "text-violet-300",
          bar: "bg-violet-400",
        },
        {
          label: "Successfully Recovered",
          value: summary.successful_actions,
          percent:
            summary.total_failed_payments > 0
              ? (summary.successful_actions /
                  summary.total_failed_payments) *
                100
              : 0,
          icon: CheckCircle2,
          tone: "text-emerald-300",
          bar: "bg-emerald-400",
        },
      ].map((stage, index) => {
        const Icon = stage.icon;

        return (
          <motion.div
            key={stage.label}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon size={12} className={stage.tone} />
                <span className="text-[10px] font-medium text-zinc-500">
                  {stage.label}
                </span>
              </div>

              <span className={`text-xs font-bold ${stage.tone}`}>
                {stage.value}
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{
                  width: `${Math.min(stage.percent, 100)}%`,
                }}
                viewport={{ once: true }}
                transition={{
                  delay: index * 0.08 + 0.15,
                  duration: 0.7,
                  ease: "easeOut",
                }}
                className={`h-full rounded-full ${stage.bar}`}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  </div>
</motion.div>

{/* REVENUE IMPACT */}
<motion.div
  initial={{ opacity: 0, y: 18 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.2 }}
  transition={{ duration: 0.6, delay: 0.08 }}
  whileHover={{ y: -3 }}
  className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-all duration-300 hover:border-emerald-400/20 hover:bg-white/[0.035]"
>
  <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-emerald-400/[0.06] blur-3xl transition-transform duration-500 group-hover:scale-125" />

  <div className="relative">
    <div className="mb-3 flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.07]">
            <DollarSign size={15} className="text-emerald-300" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">
              Revenue Impact
            </h3>
            <p className="mt-0.5 text-[10px] text-zinc-600">
              Where the money stands
            </p>
          </div>
        </div>
      </div>

      <TrendingUp size={15} className="text-emerald-400/60" />
    </div>

    <div className="h-[190px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={revenueData}
          margin={{ top: 12, right: 0, left: -24, bottom: 0 }}
        >
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "#52525b",
              fontSize: 9,
            }}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "#3f3f46",
              fontSize: 8,
            }}
            tickFormatter={(value) =>
              value >= 1000
                ? `₹${(value / 1000).toFixed(0)}k`
                : `₹${value}`
            }
          />

          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.025)" }}
            contentStyle={{
              background: "#09090b",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              fontSize: "10px",
            }}
            labelStyle={{
              color: "#a1a1aa",
            }}
            formatter={(value) => [
              formatCurrency(Number(value)),
              "Revenue",
            ]}
          />

          <Bar
            dataKey="amount"
            radius={[6, 6, 2, 2]}
            animationDuration={900}
          >
            {revenueData.map((_, index) => (
              <Cell
                key={`revenue-cell-${index}`}
                fill={
                  index === 0
                    ? "#fb7185"
                    : index === 1
                      ? "#22d3ee"
                      : "#34d399"
                }
                fillOpacity={0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div className="mt-2 grid grid-cols-3 gap-2">
      <div className="rounded-xl border border-rose-400/10 bg-rose-400/[0.035] px-3 py-2.5">
        <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-700">
          At risk
        </p>
        <p className="mt-1 text-xs font-bold text-rose-200">
          {formatCurrency(summary.revenue_at_risk)}
        </p>
      </div>

      <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.035] px-3 py-2.5">
        <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-700">
          Recoverable
        </p>
        <p className="mt-1 text-xs font-bold text-cyan-200">
          {formatCurrency(summary.recoverable_revenue)}
        </p>
      </div>

      <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.035] px-3 py-2.5">
        <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-700">
          Recovered
        </p>
        <p className="mt-1 text-xs font-bold text-emerald-200">
          {formatCurrency(summary.recovered_revenue)}
        </p>
      </div>
    </div>
  </div>
</motion.div>

{/* AI DECISION MIX */}
<motion.div
  initial={{ opacity: 0, y: 18 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.2 }}
  transition={{ duration: 0.6, delay: 0.16 }}
  whileHover={{ y: -3 }}
  className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-all duration-300 hover:border-violet-400/20 hover:bg-white/[0.035]"
>
  <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-violet-400/[0.06] blur-3xl transition-transform duration-500 group-hover:scale-125" />

  <div className="relative">
    <div className="mb-3 flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.07]">
            <Brain size={15} className="text-violet-300" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">
              AI Decision Mix
            </h3>
            <p className="mt-0.5 text-[10px] text-zinc-600">
              How the recovery agent chooses
            </p>
          </div>
        </div>
      </div>

      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-violet-300/50">
        AI routing
      </span>
    </div>

    <div className="relative h-[190px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={actionData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={54}
            outerRadius={74}
            paddingAngle={4}
            stroke="none"
            animationDuration={900}
          >
            {actionData.map((entry, index) => (
              <Cell
                key={`decision-cell-${index}`}
                fill={
                  entry.name === "Retry Payment"
                    ? "#22d3ee"
                    : entry.name === "Payment Link"
                      ? "#a78bfa"
                      : "#fbbf24"
                }
                fillOpacity={0.8}
              />
            ))}
          </Pie>

          <Tooltip
            contentStyle={{
              background: "#09090b",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              fontSize: "10px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-white">
            {actionData.reduce((sum, item) => sum + item.value, 0)}
          </p>
          <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">
            decisions
          </p>
        </div>
      </div>
    </div>

    <div className="space-y-2">
      {actionData.map((entry) => {
        const icon =
          entry.name === "Retry Payment"
            ? RefreshCw
            : entry.name === "Payment Link"
              ? Zap
              : ShieldAlert;

        const Icon = icon;

        const tone =
          entry.name === "Retry Payment"
            ? "text-cyan-300"
            : entry.name === "Payment Link"
              ? "text-violet-300"
              : "text-amber-300";

        return (
          <div
            key={entry.name}
            className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.015] px-3 py-2 transition hover:bg-white/[0.035]"
          >
            <div className="flex items-center gap-2">
              <Icon size={12} className={tone} />
              <span className="text-[10px] font-medium text-zinc-500">
                {entry.name}
              </span>
            </div>

            <span className={`text-xs font-bold ${tone}`}>
              {entry.value}
            </span>
          </div>
        );
      })}
    </div>
  </div>
</motion.div>
</div>

                  {/* EXECUTION HEALTH */}
                  <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-3">
  {/* Recovery Potential */}
  <motion.div
    whileHover={{ y: -3 }}
    className="group relative overflow-hidden rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.035] p-5 transition-all hover:border-cyan-400/25"
  >
    <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-400/[0.08] blur-2xl transition-transform duration-500 group-hover:scale-125" />

    <div className="relative">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/60">
            Recovery Potential
          </p>

          <div className="mt-2 flex items-baseline gap-1">
            <p className="text-2xl font-bold tracking-tight text-white">
              {recoveryPotential.toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <TargetIcon />
        </div>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${recoveryPotential}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full bg-cyan-400"
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[10px] text-zinc-600">
          Recoverable share of at-risk revenue
        </p>

        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-400/60">
          AI identified
        </span>
      </div>
    </div>
  </motion.div>

  {/* Execution Success */}
  <motion.div
    whileHover={{ y: -3 }}
    className="group relative overflow-hidden rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.035] p-5 transition-all hover:border-emerald-400/25"
  >
    <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-400/[0.08] blur-2xl transition-transform duration-500 group-hover:scale-125" />

    <div className="relative">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/60">
            Execution Success
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-white">
            {executionSuccessRate.toFixed(0)}%
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
          <ShieldCheck size={18} />
        </div>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${executionSuccessRate}%` }}
          transition={{
            duration: 1,
            delay: 0.1,
            ease: "easeOut",
          }}
          className="h-full rounded-full bg-emerald-400"
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[10px] text-zinc-600">
          Successful recovery executions
        </p>

        <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-400/70">
          <CheckCircle2 size={10} />
          Healthy
        </span>
      </div>
    </div>
  </motion.div>

  {/* Automated Decisions */}
  <motion.div
    whileHover={{ y: -3 }}
    className="group relative overflow-hidden rounded-2xl border border-violet-400/10 bg-violet-400/[0.035] p-5 transition-all hover:border-violet-400/25"
  >
    <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-violet-400/[0.08] blur-2xl transition-transform duration-500 group-hover:scale-125" />

    <div className="relative">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300/60">
            Automated Decisions
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-white">
            {summary.retry_cases + summary.payment_link_cases}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300">
          <Brain size={18} />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${
                summary.total_failed_payments
                  ? Math.min(
                      ((summary.retry_cases +
                        summary.payment_link_cases) /
                        summary.total_failed_payments) *
                        100,
                      100,
                    )
                  : 0
              }%`,
            }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="h-full rounded-full bg-violet-400"
          />
        </div>

        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-violet-400/60">
          AI
        </span>
      </div>

      <p className="mt-3 text-[10px] leading-5 text-zinc-600">
        Opportunities where the AI engine selected an automated payment action.
      </p>
    </div>
  </motion.div>
</div>
                </section>

                <section className="mt-10">
                  <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Zap size={17} className="text-zinc-300" />

                        <h2 className="text-lg font-semibold">
                          Recovery Queue
                        </h2>
                      </div>

                      <p className="mt-1 text-xs text-zinc-600">
                        AI-ranked opportunities requiring attention.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative">
                        <Search
                          size={15}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                        />

                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search customer or payment..."
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] py-2.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-zinc-700 focus:border-white/[0.2] sm:w-64"
                        />
                      </div>

                      <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.025] p-1">
                        <Filter size={14} className="ml-2 mr-1 text-zinc-600" />

                        {[
                          ["all", "All"],
                          ["high", "High"],
                          ["retry", "Retry"],
                          ["link", "Link"],
                          ["recovered", "Recovered"],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            onClick={() => setFilter(value)}
                            className={`rounded-lg px-2.5 py-1.5 text-[11px] transition ${
                              filter === value
                                ? "bg-white text-black"
                                : "text-zinc-500 hover:text-white"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
                    <div className="hidden grid-cols-[1.5fr_1.2fr_0.8fr_0.9fr_1fr_32px] gap-4 border-b border-white/[0.07] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-zinc-600 md:grid">
                      <span>Customer</span>
                      <span>Failure</span>
                      <span>Amount</span>
                      <span>AI Score</span>
                      <span>Action</span>
                      <span />
                    </div>

                    {loading ? (
                      <div className="flex items-center justify-center gap-2 p-12 text-sm text-zinc-600">
                        <Loader2 size={18} className="animate-spin" />
                        Loading recovery intelligence...
                      </div>
                    ) : filteredCases.length === 0 ? (
                      <div className="p-12 text-center">
                        <CreditCard
                          size={25}
                          className="mx-auto text-zinc-700"
                        />

                        <p className="mt-3 text-sm text-zinc-500">
                          No recovery cases found.
                        </p>
                      </div>
                    ) : (
                      filteredCases.map((item) => {
                        const isRecovered = item.status === "recovered";
                        const isHighRisk = item.risk_score >= 80;
                        const isMediumRisk =
                          item.risk_score >= 50 && item.risk_score < 80;

                        return (
                          <motion.button
                            key={item.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            onClick={() => setSelectedCase(item)}
                            className="group relative grid w-full gap-3 border-b border-white/[0.05] px-5 py-4 text-left transition-all last:border-0 hover:bg-white/[0.035] md:grid-cols-[1.5fr_1.2fr_0.8fr_0.9fr_1fr_32px] md:items-center md:gap-4"
                          >
                            {/* Priority indicator */}
                            <div
                              className={`absolute left-0 top-0 h-full w-[2px] transition-opacity ${
                                isRecovered
                                  ? "bg-emerald-400 opacity-40"
                                  : isHighRisk
                                    ? "bg-rose-400 opacity-80"
                                    : isMediumRisk
                                      ? "bg-amber-400 opacity-60"
                                      : "bg-cyan-400 opacity-40"
                              }`}
                            />

                            {/* Customer */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                    isRecovered
                                      ? "border-emerald-400/10 bg-emerald-400/[0.06] text-emerald-400"
                                      : isHighRisk
                                        ? "border-rose-400/10 bg-rose-400/[0.06] text-rose-400"
                                        : "border-white/[0.06] bg-white/[0.04] text-zinc-400"
                                  }`}
                                >
                                  <User size={14} />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-zinc-200">
                                    {item.customer_email}
                                  </p>

                                  <p className="mt-0.5 truncate text-[10px] text-zinc-700">
                                    {item.payment_id}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Failure */}
<div className="min-w-0">
  <div className="flex items-center gap-2">
    <div
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
        isRecovered
          ? "bg-emerald-400"
          : isHighRisk
            ? "animate-pulse bg-rose-400"
            : isMediumRisk
              ? "bg-amber-400"
              : "bg-cyan-400"
      }`}
    />

    <p className="truncate text-xs font-medium text-zinc-300">
      {item.failure_reason || "Payment failed"}
    </p>
  </div>

  <p className="mt-1.5 text-[10px] text-zinc-700">
    {formatDate(item.created_at)}
  </p>
</div>

{/* Amount */}
<div>
  <p
    className={`text-sm font-bold tracking-tight ${
      isRecovered ? "text-emerald-100" : "text-white"
    }`}
  >
    {formatCurrency(item.amount, item.currency)}
  </p>

  <div className="mt-1 flex items-center gap-1.5">
    {isRecovered ? (
      <>
        <CheckCircle2 size={10} className="text-emerald-400" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-400/70">
          recovered
        </span>
      </>
    ) : (
      <>
        <AlertTriangle
          size={10}
          className={isHighRisk ? "text-rose-400" : "text-zinc-600"}
        />
        <span
          className={`text-[9px] font-semibold uppercase tracking-[0.12em] ${
            isHighRisk ? "text-rose-400/80" : "text-zinc-700"
          }`}
        >
          at risk
        </span>
      </>
    )}
  </div>
</div>

{/* AI Risk */}
<div>
  <div className="flex items-center gap-2">
    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.07]">
      <motion.div
        initial={{ width: 0 }}
        animate={{
          width: `${Math.min(item.risk_score, 100)}%`,
        }}
        transition={{
          duration: 0.7,
          ease: "easeOut",
        }}
        className={`h-full rounded-full ${
          isHighRisk
            ? "bg-rose-400"
            : isMediumRisk
              ? "bg-amber-400"
              : "bg-cyan-400"
        }`}
      />
    </div>

    <span
      className={`text-xs font-bold ${
        isHighRisk
          ? "text-rose-300"
          : isMediumRisk
            ? "text-amber-300"
            : "text-cyan-300"
      }`}
    >
      {item.risk_score}
    </span>
  </div>

  <p
    className={`mt-1 text-[10px] font-medium ${
      isHighRisk
        ? "text-rose-400/80"
        : isMediumRisk
          ? "text-amber-400/80"
          : "text-zinc-600"
    }`}
  >
    {scoreLabel(item.risk_score)} priority
  </p>
</div>

{/* AI Action */}
<div>
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition-all ${
      isRecovered
        ? "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300"
        : item.recommended_action === "retry_payment"
          ? "border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300 group-hover:border-cyan-400/30 group-hover:bg-cyan-400/[0.09]"
          : "border-violet-400/15 bg-violet-400/[0.06] text-violet-300 group-hover:border-violet-400/30 group-hover:bg-violet-400/[0.09]"
    }`}
  >
    {isRecovered ? (
      <CheckCircle2 size={12} className="text-emerald-400" />
    ) : item.recommended_action === "retry_payment" ? (
      <RefreshCw size={12} />
    ) : (
      <Zap size={12} />
    )}

    {isRecovered
      ? "Recovered"
      : actionLabel(item.recommended_action)}
  </span>

  {!isRecovered && (
    <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-700">
      AI recommended
    </p>
  )}
</div>

{/* Open case */}
<div className="hidden justify-end md:flex">
  <div
    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
      isRecovered
        ? "border-emerald-400/10 bg-emerald-400/[0.025]"
        : isHighRisk
          ? "border-rose-400/10 bg-rose-400/[0.025]"
          : "border-transparent"
    } group-hover:border-white/[0.10] group-hover:bg-white/[0.05]`}
  >
    <ChevronRight
      size={16}
      className="text-zinc-700 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-200"
    />
  </div>
</div>

                          </motion.button>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="mt-8 grid gap-4 md:grid-cols-3">
                  <InsightCard
                    icon={<Brain size={17} />}
                    title="AI decisioning"
                    value={`${summary.retry_cases + summary.payment_link_cases}`}
                    text="Cases with an automated recovery recommendation."
                  />

                  <InsightCard
                    icon={<ShieldCheck size={17} />}
                    title="Bounded execution"
                    value={`${summary.executed_actions}`}
                    text="Actions passed through recovery execution controls."
                  />

                  <InsightCard
                    icon={<Clock3 size={17} />}
                    title="Auditability"
                    value="100%"
                    text="Recovery decisions are designed to leave an auditable trail."
                  />
                </section>
              </div>
            </div>
          </div>
        </section>
      </div>

      <RecoveryDrawer
        item={selectedCase}
        onClose={() => setSelectedCase(null)}
        onExecutionStart={() => {
          setActivePipelineStage("recover");
        }}
        onExecuted={async () => {
          // Keep RECOVER visibly active before moving to AUDIT.
          await new Promise((resolve) => setTimeout(resolve, 1000));

          setActivePipelineStage("audit");

          await loadDashboard();

          setTimeout(() => {
            setActivePipelineStage("detect");
          }, 2500);
        }}
      />
    </main>
  );
}

function TargetIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-zinc-400">
          {icon}
        </div>

        <span className="text-xs text-zinc-500">{label}</span>
      </div>

      <span className="text-lg font-semibold text-white">{value}</span>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  value,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-400">
          {icon}
          <span className="text-xs font-medium">{title}</span>
        </div>

        <span className="text-lg font-semibold text-white">{value}</span>
      </div>

      <p className="mt-3 text-xs leading-5 text-zinc-600">{text}</p>
    </div>
  );
}
