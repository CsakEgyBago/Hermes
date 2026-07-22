import type { ReactNode } from "react";

interface CollapsibleProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function Collapsible({ title, open, onToggle, children }: CollapsibleProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between p-3 text-sm font-medium text-slate-300 hover:text-slate-100"
      >
        <span>{title}</span>
        <span
          className={`text-slate-500 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        >
          ▸
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
