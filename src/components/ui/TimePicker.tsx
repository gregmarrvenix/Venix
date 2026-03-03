"use client";

import { useState, useEffect, useRef, useId } from "react";
import { nowAEST } from "@/lib/timezone";

interface TimePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function to12h(h24: number): { hour: number; period: "AM" | "PM" } {
  if (h24 === 0) return { hour: 12, period: "AM" };
  if (h24 < 12) return { hour: h24 || 12, period: "AM" };
  if (h24 === 12) return { hour: 12, period: "PM" };
  return { hour: h24 - 12, period: "PM" };
}

function to24h(hour12: number, period: "AM" | "PM"): number {
  if (period === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function generateTimeOptions(): { label: string; value: string }[] {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const { hour, period } = to12h(h);
      const label = `${hour}:${String(m).padStart(2, "0")} ${period}`;
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      options.push({ label, value });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

export function TimePicker({ label, value, onChange, error }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [period, setPeriod] = useState<"AM" | "PM">(() =>
    nowAEST().getHours() >= 12 ? "PM" : "AM"
  );
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const skipSync = useRef(false);
  const buttonId = useId();

  // Sync from external value changes
  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    if (!value) {
      setHour("");
      setMinute("");
      return;
    }
    const [h, m] = value.split(":").map(Number);
    const r = to12h(h);
    setHour(String(r.hour));
    setMinute(String(m).padStart(2, "0"));
    setPeriod(r.period);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Scroll to selected time in dropdown
  useEffect(() => {
    if (isOpen && listRef.current && value) {
      const el = listRef.current.querySelector(`[data-value="${value}"]`);
      if (el) el.scrollIntoView({ block: "center" });
    }
  }, [isOpen, value]);

  function emit(h: number, m: number, p: "AM" | "PM") {
    skipSync.current = true;
    const h24 = to24h(h, p);
    onChange(
      `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }

  function selectOption(val: string) {
    skipSync.current = true;
    onChange(val);
    setIsOpen(false);
    const [h, m] = val.split(":").map(Number);
    const r = to12h(h);
    setHour(String(r.hour));
    setMinute(String(m).padStart(2, "0"));
    setPeriod(r.period);
  }

  const displayValue = value
    ? (() => {
        const [h, m] = value.split(":").map(Number);
        const { hour: h12, period: p } = to12h(h);
        return `${h12}:${String(m).padStart(2, "0")} ${p}`;
      })()
    : "";

  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      {label && <label htmlFor={buttonId} className="text-sm text-slate-400">{label}</label>}

      {/* Main display button — click to open dropdown */}
      <button
        id={buttonId}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center rounded-lg border bg-slate-900 px-3 py-2 text-left text-sm text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none ${
          error ? "border-red-400" : "border-slate-700"
        }`}
      >
        <svg
          className="mr-2 h-4 w-4 shrink-0 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="flex-1">
          {displayValue || (
            <span className="text-slate-500">Select time</span>
          )}
        </span>
      </button>

      {/* Dropdown with manual input + quick-select list */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-lg border border-slate-700 bg-slate-800 shadow-lg">
          {/* Manual input row */}
          <div className="flex items-center gap-1 border-b border-slate-700 p-3">
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              placeholder="--"
              value={hour}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, 2);
                setHour(d);
                if (d && minute) {
                  const h = Math.max(1, Math.min(12, Number(d)));
                  if (h >= 1 && h <= 12) emit(h, Number(minute), period);
                }
              }}
              onBlur={() => {
                if (!hour) return;
                let n = Number(hour);
                if (n < 1) n = 12;
                if (n > 12) n = 12;
                setHour(String(n));
                if (minute) emit(n, Number(minute), period);
              }}
              className="w-10 rounded border border-slate-700 bg-slate-900 px-1 py-1.5 text-center text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
            <span className="text-slate-400 font-bold">:</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              placeholder="--"
              value={minute}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, 2);
                setMinute(d);
                if (hour && d) {
                  const h = Math.max(1, Math.min(12, Number(hour)));
                  const m = Math.min(59, Number(d));
                  emit(h, m, period);
                }
              }}
              onBlur={() => {
                if (!minute) return;
                let n = Number(minute);
                if (n > 59) n = 59;
                setMinute(String(n).padStart(2, "0"));
                if (hour)
                  emit(Math.max(1, Math.min(12, Number(hour))), n, period);
              }}
              className="w-10 rounded border border-slate-700 bg-slate-900 px-1 py-1.5 text-center text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const np = period === "AM" ? "PM" : "AM";
                setPeriod(np);
                if (hour && minute) {
                  emit(
                    Math.max(1, Math.min(12, Number(hour))),
                    Number(minute),
                    np
                  );
                }
              }}
              className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-indigo-400 transition-colors hover:bg-slate-700 focus:outline-none"
            >
              {period}
            </button>
          </div>

          {/* Quick-select list */}
          <div
            ref={listRef}
            className="max-h-48 overflow-y-auto py-1"
          >
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                data-value={opt.value}
                onClick={() => selectOption(opt.value)}
                className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                  opt.value === value
                    ? "bg-indigo-500 text-white"
                    : "text-slate-300 hover:bg-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
