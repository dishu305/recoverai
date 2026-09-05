"use client";

import {
  X,
  Sparkles,
  RefreshCw,
  Link2,
  UserRoundSearch,
  CheckCircle2,
  AlertTriangle,
  Brain,
} from "lucide-react";

import type { RecoveryCase } from "@/lib/api";

interface RecoveryDrawerProps {
  item: RecoveryCase | null;
  onClose: () => void;
  onExecuted?: () => void;
}

export default function RecoveryDrawer({
  item,
  onClose,
  onExecuted,
}: RecoveryDrawerProps) {
  if (!item) return null;

  const score = item.risk_score ?? 0;

  const priority =
    score >= 80
      ? "HIGH"
      : score >= 60
      ? "MEDIUM"
      : "LOW";

  const action =
    item.recommended_action ?? "manual_review";

  const actionLabel =
    action === "retry_payment"
      ? "Retry Payment"
      : action === "send_payment_link"
      ? "Send Payment Link"
      : "Manual Review";

  const ActionIcon =
    action === "retry_payment"
      ? RefreshCw
      : action === "send_payment_link"
      ? Link2
      : UserRoundSearch;

  return (
    <>
      {/* BACKDROP */}

      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />

      {/* DRAWER */}

      <aside className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-xl flex-col border-l border-white/[0.08] bg-[#0d0d10] shadow-2xl">

        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10">

              <Sparkles
                size={18}
                className="text-indigo-400"
              />

            </div>

            <div>
              <p className="text-sm font-medium">
                AI Decision Center
              </p>

              <p className="text-[11px] text-zinc-600">
                Recovery intelligence
              </p>
            </div>

          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X size={18} />
          </button>

        </div>


        {/* CONTENT */}

        <div className="flex-1 overflow-y-auto p-6">

          {/* PAYMENT */}

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs text-zinc-600">
                  Customer
                </p>

                <p className="mt-1 break-all text-sm text-zinc-200">
                  {item.customer_email}
                </p>

              </div>

              <span
                className={`rounded-md px-2 py-1 text-[10px] font-medium ${
                  priority === "HIGH"
                    ? "bg-red-500/10 text-red-300"
                    : priority === "MEDIUM"
                    ? "bg-amber-500/10 text-amber-300"
                    : "bg-white/[0.06] text-zinc-400"
                }`}
              >
                {priority} PRIORITY
              </span>

            </div>


            <div className="mt-6">

              <p className="text-xs text-zinc-600">
                Failed payment
              </p>

              <p className="mt-1 text-3xl font-semibold tracking-tight">
                ₹{Number(item.amount).toLocaleString("en-IN")}
              </p>

              <p className="mt-2 font-mono text-[10px] text-zinc-700">
                {item.payment_id}
              </p>

            </div>


            <div className="mt-5 rounded-xl border border-red-500/10 bg-red-500/[0.035] p-4">

              <div className="flex gap-3">

                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0 text-red-400"
                />

                <div>

                  <p className="text-xs font-medium text-red-300">
                    Payment failure
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {item.failure_reason}
                  </p>

                </div>

              </div>

            </div>

          </div>


          {/* SCORE */}

          <div className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <Brain
                  size={16}
                  className="text-indigo-400"
                />

                <p className="text-sm font-medium">
                  Recovery probability
                </p>

              </div>

              <p className="text-2xl font-semibold">
                {score}%
              </p>

            </div>


            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">

              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                style={{
                  width: `${score}%`,
                }}
              />

            </div>


            <p className="mt-3 text-[11px] leading-5 text-zinc-600">
              RecoverAI estimates the likelihood that
              this failed payment can be successfully
              recovered.
            </p>

          </div>


          {/* AI REASONING */}

          <div className="mt-5 rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.025] p-5">

            <div className="flex items-center gap-2">

              <Sparkles
                size={16}
                className="text-indigo-400"
              />

              <p className="text-sm font-medium">
                Why the AI recommends this
              </p>

            </div>

            <p className="mt-4 text-sm leading-6 text-zinc-400">
              {item.ai_reasoning ||
                `The AI analyzed the payment failure reason and assigned a recovery probability of ${score}%.`}
            </p>

          </div>


          {/* RECOMMENDATION */}

          <div className="mt-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.025] p-5">

            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-emerald-400">
              Recommended action
            </p>


            <div className="mt-4 flex items-center gap-4">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">

                <ActionIcon
                  size={19}
                  className="text-emerald-400"
                />

              </div>

              <div>

                <p className="font-medium">
                  {actionLabel}
                </p>

                <p className="mt-1 text-[11px] text-zinc-600">
                  Selected by RecoverAI decision engine
                </p>

              </div>

            </div>

          </div>

        </div>


        {/* FOOTER */}

        <div className="border-t border-white/[0.07] bg-[#0d0d10] p-6">

          <button
            onClick={async () => {
              try {
                const response = await fetch(
                  `http://127.0.0.1:8000/recovery/${item.id}/execute`,
                  {
                    method: "POST",
                  }
                );

                if (!response.ok) {
                  throw new Error(
                    "Recovery execution failed"
                  );
                }

                onExecuted?.();

              } catch (error) {
                console.error(error);

                alert(
                  "Unable to execute recovery action."
                );
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-medium text-black transition hover:bg-zinc-200 active:scale-[0.99]"
          >

            <CheckCircle2 size={17} />

            Execute {actionLabel}

          </button>

          <p className="mt-3 text-center text-[10px] leading-4 text-zinc-700">
            RecoverAI will record this action in the
            audit trail.
          </p>

        </div>

      </aside>
    </>
  );
}