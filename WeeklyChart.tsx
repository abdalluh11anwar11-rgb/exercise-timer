"use client";

import { dayKey, lastDays, repsOf, weekdayShort, type AppState } from "@/lib/fitness";

export function WeeklyChart({ state, days = 7 }: { state: AppState; days?: number }) {
  const keys = lastDays(days);
  const values = keys.map((day) => state.exercises.reduce((sum, ex) => sum + (ex.archived ? 0 : repsOf(state, ex.id, day)), 0));
  const max = Math.max(1, ...values);
  const today = dayKey();
  return (
    <div className="chart" dir="rtl">
      {keys.map((day, i) => (
        <div key={day} className={`chart-col ${day === today ? "today" : ""}`} title={`${weekdayShort(day)}: ${values[i]} عدة`}>
          <div className="chart-bar-wrap">
            <div className="chart-bar" style={{ height: `${Math.max(4, (values[i] / max) * 100)}%`, opacity: values[i] ? 1 : .35 }} />
          </div>
          <span className="chart-label">{weekdayShort(day).replace(/ال/, "")}</span>
        </div>
      ))}
    </div>
  );
}
