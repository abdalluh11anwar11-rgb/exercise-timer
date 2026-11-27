"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Activity, ArrowLeft, BellRing, CalendarDays, ChevronLeft, Dumbbell, Flame,
  Layers3, Sparkles, Target, Trophy, Zap,
} from "lucide-react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { MusicPlayer } from "@/components/MusicPlayer";
import { ProgressRing } from "@/components/ProgressRing";
import { WeeklyChart } from "@/components/WeeklyChart";
import { PageIntro } from "@/components/Shell";
import { activeExercises, computeStreak, dayLabel, dayKey, lifetime, monthReps, summarize } from "@/lib/fitness";
import { useFitness } from "@/lib/store";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "سهرتك تفرق 🌙";
  if (h < 12) return "صباح الخير يا بطل ☀️";
  if (h < 17) return "نهارك رياضي 💪";
  if (h < 21) return "مساء النشاط ⚡";
  return "ليلة التحدي 🌙";
}

export default function HomePage() {
  const { state, updateReminder } = useFitness();
  const [hello, setHello] = useState("أهلاً بك يا بطل 👊");
  useEffect(() => setHello(greeting()), []);

  const today = dayKey();
  const summary = useMemo(() => summarize(state, today), [state, today]);
  const streak = useMemo(() => computeStreak(state), [state]);
  const exercises = useMemo(() => activeExercises(state), [state]);
  const month = useMemo(() => monthReps(state), [state]);
  const total = useMemo(() => lifetime(state), [state]);
  const remaining = Math.max(0, summary.target - summary.reps);
  const alarm = state.reminder.enabled;

  return (
    <>
      <PageIntro
        eyebrow={dayLabel(today)}
        title={hello}
        subtitle={summary.complete ? "أنهيت كل كروت اليوم — أسطورة حقيقية! 🎉" : remaining > 0 ? `باقي ${remaining} ${exercises[0]?.unit || "عدة"} لإنهاء هدف اليوم. يلا بينا!` : "ابدأ يومك بضغطة واحدة"}
        icon={Sparkles}
      />

      <section className="glass hero-card panel reveal" style={{ animationDelay: "60ms" }}>
        <ProgressRing value={summary.pct} className="float" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="chip active"><Zap size={12} /> {summary.complete ? "اليوم مكتمل" : "جارٍ التنفيذ"}</span>
            <span className="chip"><Trophy size={12} /> {summary.doneCards}/{summary.totalCards} كارت خلص</span>
          </div>
          <h2 className="mt-3 text-2xl font-black leading-snug sm:text-3xl">
            {summary.complete ? "هدف اليوم اتحقق 🔥" : "كل عدة تقرّبك من نسخة أقوى منك"}
          </h2>
          <p className="muted mt-1 max-w-xl">
            {summary.complete ? "سجّلت كل التمارين — شكراً لالتزامك. غداً نكمل بقوة." : "سجّل تمرينك أول بأول، وخلّي كل ضغطة تظهر هنا فوراً."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/workouts" className="btn-3d">ابدأ التمرين <ArrowLeft size={15} /></Link>
            <Link href="/history" className="btn-3d btn-dark">شوف إنجازاتك <ChevronLeft size={15} /></Link>
          </div>
        </div>
      </section>

      <div className="stat-grid mt-4">
        {[
          { icon: Target, label: "عدات اليوم", value: summary.reps, sub: `من ${summary.target}`, color: "#c8ff35", glow: "rgba(200,255,53,.16)" },
          { icon: Flame, label: "سلسلة الالتزام", value: streak, sub: "يوم متتالي", color: "#ff9a3d", glow: "rgba(255,154,61,.16)" },
          { icon: CalendarDays, label: "عدات الشهر", value: month, sub: "هذا الشهر", color: "#4cd7f5", glow: "rgba(76,215,245,.16)" },
          { icon: Trophy, label: "الإجمالي", value: total, sub: "كل الأيام", color: "#a78bfa", glow: "rgba(167,139,250,.16)" },
        ].map((s, i) => (
          <div key={s.label} className="stat-tile reveal" style={{ animationDelay: `${100 + i * 60}ms`, ["--tile-color" as string]: s.color, ["--tile-glow" as string]: s.glow } as CSSProperties}>
            <s.icon className="stat-icon" size={42} />
            <b>{s.value.toLocaleString("ar-EG")}</b>
            <span>{s.label} · {s.sub}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="glass panel flex items-center gap-4 reveal" style={{ animationDelay: "180ms" }}>
          <div className="grid h-14 w-14 flex-none place-items-center rounded-2xl bg-orange-500/15 text-orange-400 shadow-[inset_0_1px_0_rgba(255,255,255,.12)]"><BellRing size={26} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><h3 className="text-sm font-black">المنبه اليومي</h3><span className={`chip ${alarm ? "active" : ""}`}>{alarm ? "شغال" : "متوقف"}</span></div>
            <p className="muted mt-1">{alarm ? `هيذكّرك الساعة ${state.reminder.time} — ${state.reminder.message}` : "المنبه متوقف — فعّله من الإعدادات"}</p>
          </div>
          <button
            onClick={() => updateReminder({ enabled: !alarm })}
            className={`switch ${alarm ? "on" : ""}`} aria-label="تبديل المنبه" aria-pressed={alarm}
          ><i /></button>
        </div>
        <div className="glass panel flex items-center gap-3 reveal" style={{ animationDelay: "220ms" }}>
          <div className="grid h-14 w-14 flex-none place-items-center rounded-2xl bg-blue-400/10 text-cyan-300"><Layers3 size={26} /></div>
          <div><h3 className="text-sm font-black">اختصارات سريعة</h3><p className="muted mt-1">كل أدواتك في مكان واحد</p></div>
          <div className="mr-auto flex gap-2">
            <Link href="/workouts" className="icon-btn !h-10 !w-10" aria-label="التمارين"><Dumbbell size={17} /></Link>
            <Link href="/history" className="icon-btn !h-10 !w-10" aria-label="السجل"><Activity size={17} /></Link>
          </div>
        </div>
      </div>

      <div className="section-head">
        <div><p className="eyebrow">Daily Circuit</p><h2 className="h2">كروت النهارده</h2></div>
        <span className="muted">كل ضغطة بتتحفظ فوراً على جهازك</span>
      </div>
      <div className="ex-grid">
        {exercises.map((exercise, i) => <ExerciseCard key={exercise.id} exercise={exercise} index={i} />)}
      </div>

      <div className="section-head"><div><p className="eyebrow">Performance</p><h2 className="h2">نبض الأسبوع والموسيقى</h2></div></div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        <section className="glass panel reveal" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between">
            <div><h3 className="text-base font-black">نبض الأسبوع</h3><p className="muted">آخر 7 أيام</p></div>
            <div className="flex items-center gap-2"><Flame size={17} className="text-orange-400" /><b className="text-xl">{streak}</b></div>
          </div>
          <WeeklyChart state={state} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/[.04] p-2"><b className="block text-lg text-lime-300">{month}</b><span className="text-[10px] font-bold text-white/40">عدة الشهر</span></div>
            <div className="rounded-xl bg-white/[.04] p-2"><b className="block text-lg text-cyan-300">{Object.keys(state.logs).filter((d) => Object.values(state.logs[d]).some((v) => v > 0)).length}</b><span className="text-[10px] font-bold text-white/40">يوم اتمرنت</span></div>
            <div className="rounded-xl bg-white/[.04] p-2"><b className="block text-lg text-violet-300">{streak}</b><span className="text-[10px] font-bold text-white/40">سلسلة</span></div>
          </div>
        </section>
        <MusicPlayer />
      </div>
    </>
  );
}
