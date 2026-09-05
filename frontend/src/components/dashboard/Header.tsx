"use client";

import {
  Bell,
  Search,
  ChevronDown,
  Command,
} from "lucide-react";

export default function Header() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-white/[0.08] px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
          />

          <input
            placeholder="Search payments, customers..."
            className="h-10 w-72 rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-12 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/[0.18]"
          />

          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-white/[0.08] px-1.5 py-1 text-[10px] text-zinc-600">
            <Command size={10} />
            K
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white">
          <Bell size={17} />

          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </button>

        <div className="hidden h-8 w-px bg-white/[0.08] sm:block" />

        <button className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/[0.04]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 text-xs font-semibold text-white">
            D
          </div>

          <div className="hidden text-left sm:block">
            <div className="text-xs font-medium text-white">
              Dishu
            </div>

            <div className="text-[10px] text-zinc-600">
              Administrator
            </div>
          </div>

          <ChevronDown size={14} className="text-zinc-600" />
        </button>
      </div>
    </header>
  );
}