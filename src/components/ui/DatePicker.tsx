"use client";

import { useState, useRef, useEffect, useId } from "react";

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

type View = "days" | "months" | "years";

export function DatePicker({ label, value, onChange, error }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value + "T00:00:00");
    return new Date();
  });
  const [view, setView] = useState<View>("days");
  const ref = useRef<HTMLDivElement>(null);
  const buttonId = useId();

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setView("days");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  useEffect(() => {
    if (value) setViewDate(new Date(value + "T00:00:00"));
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const selectedDate = value ? new Date(value + "T00:00:00") : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function selectDay(day: number) {
    const d = new Date(year, month, day);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
    setView("days");
  }

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const monthName = viewDate.toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  });

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  // Year grid: show 12 years centered around current
  const yearStart = year - 5;
  const yearRange = Array.from({ length: 12 }, (_, i) => yearStart + i);

  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      {label && <label htmlFor={buttonId} className="text-sm text-slate-400">{label}</label>}
      <button
        id={buttonId}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center rounded-lg border bg-slate-900 px-3 py-2 text-left text-sm text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none ${
          error ? "border-red-400" : "border-slate-700"
        }`}
      >
        <span className="flex-1">
          {displayValue || (
            <span className="text-slate-500">Select date</span>
          )}
        </span>
        <svg
          className="h-4 w-4 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-lg">
          {/* Header with nav */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (view === "days") setViewDate(new Date(year, month - 1, 1));
                else if (view === "months") setViewDate(new Date(year - 1, month, 1));
                else setViewDate(new Date(year - 12, month, 1));
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                if (view === "days") setView("months");
                else if (view === "months") setView("years");
                else setView("days");
              }}
              className="rounded px-2 py-1 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              {view === "years"
                ? `${yearRange[0]} — ${yearRange[yearRange.length - 1]}`
                : view === "months"
                  ? String(year)
                  : monthName}
            </button>
            <button
              type="button"
              onClick={() => {
                if (view === "days") setViewDate(new Date(year, month + 1, 1));
                else if (view === "months") setViewDate(new Date(year + 1, month, 1));
                else setViewDate(new Date(year + 12, month, 1));
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Year grid */}
          {view === "years" && (
            <div className="grid grid-cols-3 gap-2">
              {yearRange.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setViewDate(new Date(y, month, 1));
                    setView("months");
                  }}
                  className={`rounded-md py-2 text-sm transition-colors ${
                    y === year
                      ? "bg-indigo-500 text-white"
                      : y === today.getFullYear()
                        ? "bg-slate-700 text-slate-200 font-medium"
                        : "text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Month grid */}
          {view === "months" && (
            <div className="grid grid-cols-3 gap-2">
              {monthNames.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setViewDate(new Date(year, i, 1));
                    setView("days");
                  }}
                  className={`rounded-md py-2 text-sm transition-colors ${
                    i === month && year === viewDate.getFullYear()
                      ? "bg-indigo-500 text-white"
                      : i === today.getMonth() && year === today.getFullYear()
                        ? "bg-slate-700 text-slate-200 font-medium"
                        : "text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* Day grid */}
          {view === "days" && (
            <>
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} />;
                  const date = new Date(year, month, day);
                  const isSelected =
                    selectedDate && date.getTime() === selectedDate.getTime();
                  const isToday = date.getTime() === today.getTime();
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={`rounded-md py-1.5 text-xs transition-colors ${
                        isSelected
                          ? "bg-indigo-500 text-white"
                          : isToday
                            ? "bg-slate-700 text-slate-200 font-medium"
                            : "text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
