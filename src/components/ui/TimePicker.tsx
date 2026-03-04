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

type ClockMode = "hour" | "minute";

const CLOCK_SIZE = 216;
const CENTER = CLOCK_SIZE / 2;
const NUM_RADIUS = 80;
const HAND_LENGTH = 64;

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_LABELS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function clockPosition(value: number, total: number) {
  const angleRad = ((value / total) * 360 * Math.PI) / 180;
  return {
    x: CENTER + NUM_RADIUS * Math.sin(angleRad),
    y: CENTER - NUM_RADIUS * Math.cos(angleRad),
  };
}

export function TimePicker({ label, value, onChange, error }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ClockMode>("hour");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [period, setPeriod] = useState<"AM" | "PM">(() =>
    nowAEST().getHours() >= 12 ? "PM" : "AM"
  );
  const ref = useRef<HTMLDivElement>(null);
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

  function emit(h: number, m: number, p: "AM" | "PM") {
    skipSync.current = true;
    const h24 = to24h(h, p);
    onChange(
      `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }

  function handleHourClick(h: number) {
    setHour(String(h));
    setMode("minute");
    if (minute) {
      emit(h, Number(minute), period);
    }
  }

  function handleMinuteClick(m: number) {
    const mStr = String(m).padStart(2, "0");
    setMinute(mStr);
    if (hour) {
      emit(Number(hour), m, period);
    }
    setIsOpen(false);
    setMode("hour");
  }

  const displayValue = value
    ? (() => {
        const [h, m] = value.split(":").map(Number);
        const { hour: h12, period: p } = to12h(h);
        return `${h12}:${String(m).padStart(2, "0")} ${p}`;
      })()
    : "";

  const selectedHour = hour ? Number(hour) : null;
  const selectedMinute = minute !== "" ? Number(minute) : null;

  const showHand =
    mode === "hour" ? selectedHour !== null : selectedMinute !== null;
  const handAngle =
    mode === "hour"
      ? selectedHour !== null
        ? ((selectedHour % 12) / 12) * 360
        : 0
      : selectedMinute !== null
        ? (selectedMinute / 60) * 360
        : 0;

  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      {label && (
        <label htmlFor={buttonId} className="text-sm text-slate-400">
          {label}
        </label>
      )}

      <button
        id={buttonId}
        type="button"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            setMode("hour");
            setIsOpen(true);
          }
        }}
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

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 rounded-lg border border-slate-700 bg-slate-800 shadow-lg p-4 w-[248px]">
          {/* Manual override inputs */}
          <div className="flex items-center justify-center gap-1 mb-3">
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
              onFocus={() => setMode("hour")}
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
              onFocus={() => setMode("minute")}
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

          {/* Mode tabs */}
          <div className="flex justify-center gap-4 mb-2">
            <button
              type="button"
              onClick={() => setMode("hour")}
              className={`text-xs font-medium transition-colors ${
                mode === "hour"
                  ? "text-indigo-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Hour
            </button>
            <button
              type="button"
              onClick={() => setMode("minute")}
              className={`text-xs font-medium transition-colors ${
                mode === "minute"
                  ? "text-indigo-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Minute
            </button>
          </div>

          {/* Clock face */}
          <div
            className="relative mx-auto"
            style={{ width: CLOCK_SIZE, height: CLOCK_SIZE }}
          >
            {/* Background circle */}
            <div className="absolute inset-0 rounded-full bg-slate-900" />

            {/* Hand line */}
            {showHand && (
              <div
                className="absolute left-1/2 bottom-1/2 w-0.5 bg-indigo-500 origin-bottom transition-transform duration-200"
                style={{
                  height: HAND_LENGTH,
                  transform: `translateX(-50%) rotate(${handAngle}deg)`,
                }}
              />
            )}

            {/* Center dot */}
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500 z-10" />

            {/* Number buttons */}
            {mode === "hour"
              ? HOURS.map((h) => {
                  const pos = clockPosition(h % 12, 12);
                  const isSelected = selectedHour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleHourClick(h)}
                      className={`absolute flex h-8 w-8 items-center justify-center rounded-full text-sm -translate-x-1/2 -translate-y-1/2 transition-colors ${
                        isSelected
                          ? "bg-indigo-500 text-white font-medium"
                          : "text-slate-300 hover:bg-slate-700"
                      }`}
                      style={{ left: pos.x, top: pos.y }}
                    >
                      {h}
                    </button>
                  );
                })
              : MINUTE_LABELS.map((m) => {
                  const pos = clockPosition(m, 60);
                  const isSelected = selectedMinute === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleMinuteClick(m)}
                      className={`absolute flex h-8 w-8 items-center justify-center rounded-full text-sm -translate-x-1/2 -translate-y-1/2 transition-colors ${
                        isSelected
                          ? "bg-indigo-500 text-white font-medium"
                          : "text-slate-300 hover:bg-slate-700"
                      }`}
                      style={{ left: pos.x, top: pos.y }}
                    >
                      {String(m).padStart(2, "0")}
                    </button>
                  );
                })}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
