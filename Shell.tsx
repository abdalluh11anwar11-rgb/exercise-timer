"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing, CalendarDays, CheckCircle2, Cloud, CloudOff, Dumbbell, Flame,
  LayoutDashboard, Settings as SettingsIcon, Sparkles, Trophy, Zap,
} from "lucide-react";
import { audioEngine } from "@/lib/audio";
import { computeStreak, dayKey, pad } from "@/lib/fitness";
import { MiniPlayer } from "./MusicPlayer";
import { useFitness } from "@/lib/store";

const NAV = [
  { href: "/", label: "الرئيسية", short: "الرئيسية", icon: LayoutDashboard },
  { href: "/workouts", label: "التمارين", short: "تمارين", icon: Dumbbell },
  { href: "/history", label: "السجل", short: "السجل", icon: CalendarDays },
  { href: "/settings", label: "الإعدادات", short: "إعدادات", icon: SettingsIcon },
];

function Toasts() {
  const { toasts, dismissToast } = useFitness();
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <button key={t.id} onClick={() => dismissToast(t.id)} className={`toast ${t.kind}`}>
          {t.kind === "party" ? <Trophy size={16} className="text-orange-400" /> : t.kind === "warn" ? <Zap size={16} className="text-pink-400" /> : <CheckCircle2 size={16} className="text-lime-300" />}
          {t.message}
        </button>
      ))}
    </div>
  );
}

function ReminderScheduler() {
  const { state, toast } = useFitness();
  useEffect(() => {
    const check = () => {
      const r = state.reminder;
      if (!r.enabled) return;
      const now = new Date();
      const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      if (time !== r.time || !r.days.includes(now.getDay())) return;
      const firedKey = `addad.fired.${dayKey()}.${time}`;
      try {
        if (localStorage.getItem(firedKey)) return;
        localStorage.setItem(firedKey, "1");
      } catch { /* ignore */ }
      audioEngine.chime("alarm");
      toast(`⏰ ${r.message}`, "party");
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const n = new Notification("عَدّاد — موعد التمرين", {
          body: r.message,
          icon: "/icon.svg",
          data: { url: r.url || "/" },
        });
        n.onclick = () => {
          window.focus();
          if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
          else window.location.href = "/";
        };
      }
    };
    const id = setInterval(check, 20000);
    check();
    return () => clearInterval(id);
  }, [state.reminder, toast]);
  return null;
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, ready, syncing } = useFitness();
  const streak = useMemo(() => (ready ? computeStreak(state) : 0), [state, ready]);

  return (
    <div className="app-shell">
      <ReminderScheduler />
      <aside className="sidebar">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <span className="brand-mark"><Zap size={27} fill="#10240a" strokeWidth={2.4} /></span>
          <span className="brand-text">
            <span className="block text-xl font-black leading-none text-white">عَدّاد</span>
            <span className="block text-[10px] font-extrabold tracking-[.16em] text-lime-300/70">EXERCISE TIMER</span>
          </span>
        </Link>

        <div>
          <p className="nav-heading mb-2 px-3 text-[10px] font-black tracking-widest text-white/30">التنقل</p>
          <nav className="flex flex-col gap-2">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-link ${pathname === href ? "active" : ""}`} title={label}>
                <Icon size={19} />
                <span className="nav-label">{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="glass rounded-2xl p-4 side-foot">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-orange-400" />
            <span className="text-xs font-extrabold">سلسلة الالتزام</span>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <b className="text-3xl font-black text-white">{streak}</b>
            <span className="text-[10px] font-bold text-white/40">يوم متتالي</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/10"><i className="block h-full w-2/3 rounded-full bg-gradient-to-l from-orange-400 to-lime-300 shadow-[0_0_12px_rgba(200,255,53,.5)]" /></div>
        </div>

        <div className="mt-auto side-foot">
          <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/[.03] p-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-blue-600 text-sm font-black">A</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold">بطل اليوم</p>
              <p className="flex items-center gap-1 text-[10px] font-bold text-white/40">
                {syncing ? <Cloud size={11} /> : <CloudOff size={11} />}
                {syncing ? "جارٍ الحفظ…" : "محفوظ على جهازك"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="mobile-top">
        <Link href="/" className="flex items-center gap-2">
          <span className="brand-mark !h-10 !w-10 !rounded-[14px]"><Zap size={21} fill="#10240a" /></span>
          <span className="text-lg font-black">عَدّاد</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="chip !border-orange-400/30 !text-orange-300"><Flame size={13} /> {streak}</span>
          <Link href="/settings" className="icon-btn !h-9 !w-9" aria-label="الإعدادات"><BellRing size={17} /></Link>
        </div>
      </div>

      <main className="main-area">{children}</main>

      <MiniPlayer />
      <nav className="bottom-nav" aria-label="التنقل الرئيسي">
        {NAV.map(({ href, short, icon: Icon }) => (
          <Link key={href} href={href} className={pathname === href ? "active" : ""}>
            <Icon size={21} strokeWidth={pathname === href ? 2.7 : 2} />
            <span>{short}</span>
          </Link>
        ))}
      </nav>
      <Toasts />
    </div>
  );
}

export function PageIntro({ eyebrow, title, subtitle, icon: Icon }: {
  eyebrow: string; title: string; subtitle: string; icon: typeof Sparkles;
}) {
  return (
    <header className="page-head reveal">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="h1">{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      <div className="glass hidden h-12 w-12 place-items-center rounded-2xl sm:grid">
        <Icon size={22} className="text-lime-300" />
      </div>
    </header>
  );
}
