"use client";

import {
  LayoutDashboard,
  CreditCard,
  Users,
  BarChart3,
  Bot,
  Activity,
  Settings,
  Sparkles,
} from "lucide-react";

const navigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    active: true,
  },
  {
    label: "Recovery",
    icon: CreditCard,
  },
  {
    label: "Customers",
    icon: Users,
  },
  {
    label: "Analytics",
    icon: BarChart3,
  },
];

const aiNavigation = [
  {
    label: "AI Decisions",
    icon: Bot,
  },
  {
    label: "Live Activity",
    icon: Activity,
  },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/[0.08] bg-[#09090b] lg:flex lg:flex-col">
      <div className="flex h-20 items-center px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
            <Sparkles size={18} />
          </div>

          <div>
            <div className="text-lg font-semibold tracking-tight text-white">
              RecoverAI
            </div>

            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Revenue Intelligence
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-4">
        <p className="mb-3 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
          Workspace
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  item.active
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-3 py-4">
        <p className="mb-3 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
          Intelligence
        </p>

        <nav className="space-y-1">
          {aiNavigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200"
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

            <span className="text-xs font-medium text-zinc-300">
              AI Engine Online
            </span>
          </div>

          <p className="text-xs leading-5 text-zinc-500">
            Recovery intelligence is actively monitoring failed payments.
          </p>
        </div>

        <button className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-500 hover:text-zinc-200">
          <Settings size={17} />
          Settings
        </button>
      </div>
    </aside>
  );
}