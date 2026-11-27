"use client";

import { useId } from "react";

export function ProgressRing({ value, className = "" }: { value: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`ring-wrap ${className}`}>
      <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,.1),transparent_65%)]" />
      <svg viewBox="0 0 140 140" aria-label={`${pct}% من الهدف`}>
        <defs>
          <linearGradient id={`ringGradient-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c8ff35" />
            <stop offset="55%" stopColor="#4cd7f5" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx="70" cy="70" r={radius} />
        <circle
          className="ring-arc"
          cx="70" cy="70" r={radius}
          stroke={`url(#ringGradient-${id})`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
        />
      </svg>
      <div className="ring-center">
        <b>{pct}%</b>
        <span>من هدف اليوم</span>
      </div>
    </div>
  );
}
