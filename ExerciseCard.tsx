"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Pause, Play, RotateCcw, Settings2, Sparkles, Timer, Check } from "lucide-react";
import { audioEngine } from "@/lib/audio";
import { ACCENTS, dayKey, levelFor, repsOf, type Exercise } from "@/lib/fitness";
import { useFitness } from "@/lib/store";
import Link from "next/link";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ExerciseCard({ exercise, index = 0 }: { exercise: Exercise; index?: number }) {
  const { state, addReps, toast } = useFitness();
  const day = dayKey();
  const value = repsOf(state, exercise.id, day);
  const target = exercise.target;
  const isTime = exercise.mode === "time" || exercise.unit === "ثانية";
  const pct = Math.min(100, Math.round((value / target) * 100));
  const level = levelFor(value, target);
  const accent = ACCENTS[exercise.accent] ?? ACCENTS.volt;
  const [bump, setBump] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const celebratedRef = useRef(false);

  // Timer state lives inside the card that needs it.
  const durations = useMemo(() => {
    const options = [30, 60, 120, 180, target].filter((n) => Number.isFinite(n) && n >= 10);
    return [...new Set(options)].sort((a, b) => a - b).slice(-4);
  }, [target]);
  const [duration, setDuration] = useState(durations.includes(target) ? target : durations[durations.length - 1]);
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        audioEngine.chime("complete");
        addReps(exercise, duration);
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 1800);
      }
    };
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [running, duration, exercise, addReps]);

  useEffect(() => {
    if (isTime || value < target || celebratedRef.current) return;
    celebratedRef.current = true;
    audioEngine.chime("complete");
    setCelebrate(true);
    const id = setTimeout(() => setCelebrate(false), 1700);
    return () => clearTimeout(id);
  }, [value, target, isTime]);

  useEffect(() => {
    if (value < target) celebratedRef.current = false;
  }, [value, target]);

  const doAdd = (amount: number) => {
    addReps(exercise, amount);
    setBump(true);
    setTimeout(() => setBump(false), 350);
  };

  const start = () => {
    if (remaining <= 0) setRemaining(duration);
    endAt.current = Date.now() + (remaining > 0 ? remaining : duration) * 1000;
    setRunning(true);
    audioEngine.chime("tick");
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setRemaining(duration);
    toast("المؤقت اتصفّر ✔", "info");
  };
  const chooseDuration = (d: number) => {
    setRunning(false);
    setDuration(d);
    setRemaining(d);
  };
  const timerPct = Math.min(100, Math.round(((duration - remaining) / Math.max(1, duration)) * 100));

  return (
    <div
      className="scene reveal"
      style={{ animationDelay: `${Math.min(index * 70, 500)}ms` }}
      data-accent={exercise.accent}
    >
      <article className="ex-card tilt">
        {celebrate && (
          <div className="celebrate">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className="spark"
                style={{
                  ["--dx" as string]: `${Math.cos((i / 12) * Math.PI * 2) * 120}px`,
                  ["--dy" as string]: `${Math.sin((i / 12) * Math.PI * 2) * 120}px`,
                  animationDelay: `${(i % 4) * 55}ms`,
                }}
              />
            ))}
            <div className="relative z-10">
              <div className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-2xl" style={{ background: accent.glow, boxShadow: `0 0 40px ${accent.glow}` }}>
                <Check size={34} strokeWidth={3.5} color="#08100d" />
              </div>
              <b>Goal Crushed!</b>
              <p className="mt-1 text-xs font-bold text-white/70">أحسنت 👏 استمر على هذا الأداء</p>
            </div>
          </div>
        )}

        <div className="ex-top">
          <div className="ex-visual float" style={{ animationDelay: `${index * -0.6}s` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={(exercise.image || "/exercises/pushup.webp").replace(/\.png$/, ".webp")} alt={`رسم توضيحي لتمرين ${exercise.name}`} loading="lazy" />
            <span className="ex-badge">{exercise.emoji}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="ex-name">{exercise.name}</h3>
                <p className="ex-hint">{exercise.hint}</p>
              </div>
              <Link href="/settings" className="icon-btn !h-8 !w-8 !rounded-[10px]" aria-label={`تعديل ${exercise.name}`} title="تعديل التمرين">
                <Settings2 size={15} />
              </Link>
            </div>
            <div className="level-row">
              {[1, 2, 3, 4, 5].map((n) => <i key={n} className={`level-pip ${n <= level ? "on" : ""}`} />)}
              <span className="mr-1 text-[10px] font-extrabold" style={{ color: accent.hex }}>LVL {level}</span>
            </div>
          </div>
        </div>

        <div className="ex-meta mt-4">
          <span>الإنجاز</span>
          <span><b>{value}</b> / {target} {exercise.unit}</span>
        </div>
        <div className="ex-progress"><i style={{ width: `${pct}%` }} /></div>

        {isTime ? (
          <div className={`timer-box ${running ? "running" : ""}`}>
            <div className="timer-digits">{formatTime(remaining)}</div>
            <div className="timer-label">{running ? "العدّاد يعمل — تنفّس بعمق" : remaining === 0 ? "انتهى الوقت! أحسنت" : "اضغط ابدأ لتبدأ المدة"}</div>
            <div className="ex-progress !my-3 !h-[6px]"><i style={{ width: `${timerPct}%` }} /></div>
            <div className="timer-actions">
              <button className="btn-3d" onClick={running ? pause : start} aria-label={running ? "إيقاف مؤقت" : "بدء المؤقت"}>
                {running ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                {running ? "إيقاف" : "ابدأ"}
              </button>
              <button className="btn-3d btn-dark" onClick={reset} aria-label="إعادة ضبط المؤقت">
                <RotateCcw size={14} /> تصفير
              </button>
              <button className="btn-3d btn-blue" onClick={() => { if (remaining > 0) addReps(exercise, duration - remaining); setRunning(false); setRemaining(0); }} aria-label="تسجيل الجولة كاملة">
                <Check size={15} /> تسجيل
              </button>
            </div>
            <div className="dur-row">
              {durations.map((d) => (
                <button key={d} className={`dur-pill ${d === duration ? "on" : ""}`} onClick={() => chooseDuration(d)}>{d >= 60 ? `${d / 60}د` : `${d}ث`}</button>
              ))}
              <span className="dur-pill !bg-transparent !border-transparent flex items-center gap-1"><Timer size={11} /> المدة</span>
            </div>
          </div>
        ) : (
          <div className="counter-shell">
            <div className={`counter-value ${bump ? "bump" : ""}`}>{value}</div>
            <div className="counter-unit">{exercise.unit} مسجّلة اليوم</div>
            <div className="counter-controls">
              <button className="round-btn" onClick={() => doAdd(-Math.min(exercise.step, value))} aria-label="إنقاص" disabled={value === 0}><Minus size={19} /></button>
              <button className="btn-3d !h-12 !w-full" onClick={() => doAdd(exercise.step)} aria-label={`أضف ${exercise.step} ${exercise.unit}`}>
                <Sparkles size={16} /> +{exercise.step} {exercise.unit}
              </button>
              <button className="round-btn plus" onClick={() => doAdd(1)} aria-label="أضف واحدة"><span>+</span></button>
            </div>
            <div className="step-row">
              {[1, 2, 3].map((multiplier) => (
                <button key={multiplier} className="step-pill" onClick={() => doAdd(exercise.step * multiplier)}>+{exercise.step * multiplier}</button>
              ))}
              <button className="step-pill" onClick={() => doAdd(Math.max(1, target - value))}>أكمل الهدف 🎯</button>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
