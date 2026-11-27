/** Legacy-compatible domain model. The localStorage key `addad.v1` is never changed. */
export const STORAGE_KEY = "addad.v1";

export type Accent = "volt" | "orange" | "sky" | "violet" | "pink" | "rose";

export interface Exercise {
  id: number;
  name: string;
  unit: string;
  target: number;
  step: number;
  emoji: string;
  hint: string;
  accent: Accent;
  archived?: boolean;
  /** Extension: time based exercises keep the classic `unit: "ثانية"` logs. */
  mode?: "reps" | "time";
  image?: string;
}

export interface Reminder {
  enabled: boolean;
  time: string;
  days: number[];
  sound: string;
  url: string;
  message: string;
}

export interface CustomTrack {
  id: string;
  name: string;
  artist?: string;
  source: "file" | "url";
  url?: string;
  mime?: string;
}

export interface AppState {
  exercises: Exercise[];
  logs: Record<string, Record<string, number>>;
  reminder: Reminder;
  nextId: number;
  volume?: number;
  musicTrack?: string;
  customTracks?: CustomTrack[];
}

export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 1, name: "ضغط", unit: "عدة", target: 50, step: 10, emoji: "💪", hint: "صدر وكتف وترايسبس", accent: "volt", image: "/exercises/pushup.webp" },
  { id: 2, name: "بطن", unit: "عدة", target: 100, step: 20, emoji: "🔥", hint: "كور كامل", accent: "orange", image: "/exercises/abs.webp" },
  { id: 3, name: "عقلة", unit: "عدة", target: 30, step: 5, emoji: "🦾", hint: "ظهر وبايسبس", accent: "sky", image: "/exercises/pullup.webp" },
  { id: 4, name: "سكوات", unit: "عدة", target: 60, step: 15, emoji: "🦵", hint: "رجل واتزان", accent: "violet", image: "/exercises/squat.webp" },
  { id: 5, name: "بربيز", unit: "عدة", target: 30, step: 10, emoji: "⚡", hint: "كارديو سريع", accent: "pink", image: "/exercises/burpee.webp" },
  { id: 6, name: "بلانك", unit: "ثانية", target: 120, step: 30, emoji: "🧘", hint: "ثبّت واتنفس", accent: "rose", mode: "time", image: "/exercises/plank.webp" },
];

export const DEFAULT_REMINDER: Reminder = {
  enabled: true,
  time: "22:00",
  days: [0, 1, 2, 3, 4, 5, 6],
  sound: "hype",
  url: "",
  message: "قوم اتمرن يا وحش… الدنيا مستنياك 👊",
};

export function defaultState(): AppState {
  return {
    exercises: DEFAULT_EXERCISES.map((ex) => ({ ...ex })),
    logs: {},
    reminder: { ...DEFAULT_REMINDER, days: [...DEFAULT_REMINDER.days] },
    nextId: DEFAULT_EXERCISES.length + 1,
    volume: 65,
    musicTrack: "hype",
    customTracks: [],
  };
}

/** Accepts an old `addad.v1` document, ignores unknown fields, and repairs missing ones. */
export function normalizeState(input: unknown): AppState {
  const base = defaultState();
  if (!input || typeof input !== "object" || Array.isArray(input)) return base;
  const raw = input as Partial<AppState>;
  const exercises = Array.isArray(raw.exercises)
    ? raw.exercises
        .filter((e): e is Exercise => !!e && typeof e.id === "number" && typeof e.name === "string")
        .map((e) => ({
          ...e,
          unit: e.unit || "عدة",
          target: Math.max(1, Number(e.target) || 1),
          step: Math.max(1, Number(e.step) || 1),
          emoji: e.emoji || "💪",
          hint: e.hint || "",
          accent: (["volt", "orange", "sky", "violet", "pink", "rose"] as Accent[]).includes(e.accent)
            ? e.accent
            : "volt",
          image: (e.image || imageFor(e.name)).replace(/\.png$/, ".webp"),
          mode: e.mode || (e.unit === "ثانية" ? "time" : "reps"),
        }))
    : base.exercises;
  const logs: AppState["logs"] = {};
  if (raw.logs && typeof raw.logs === "object") {
    for (const [day, row] of Object.entries(raw.logs)) {
      if (!row || typeof row !== "object") continue;
      logs[day] = {};
      for (const [id, value] of Object.entries(row as Record<string, unknown>)) {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) logs[day][id] = Math.min(100000, Math.round(n));
      }
    }
  }
  const reminder = { ...base.reminder, ...(raw.reminder || {}) };
  if (!Array.isArray(reminder.days) || reminder.days.length === 0) reminder.days = [0, 1, 2, 3, 4, 5, 6];
  const nextId = Math.max(
    Number(raw.nextId) || 1,
    exercises.reduce((m, e) => Math.max(m, Number(e.id) + 1), 1),
  );
  const customTracks = Array.isArray(raw.customTracks)
    ? raw.customTracks.filter((t): t is CustomTrack =>
        !!t && typeof t.id === "string" && typeof t.name === "string" &&
        (t.source === "file" || t.source === "url") &&
        (t.source === "file" || typeof t.url === "string"))
    : [];

  return {
    exercises: exercises.length ? exercises : base.exercises,
    logs,
    reminder,
    nextId,
    volume: typeof raw.volume === "number" ? raw.volume : 65,
    musicTrack: raw.musicTrack || reminder.sound || "hype",
    customTracks,
  };
}

export function imageFor(name: string): string {
  const n = name.trim();
  if (/ضغط|push/i.test(n)) return "/exercises/pushup.webp";
  if (/بطن|core|abs/i.test(n)) return "/exercises/abs.webp";
  if (/عقلة|pull|سحب/i.test(n)) return "/exercises/pullup.webp";
  if (/سكوات|squat|رجل/i.test(n)) return "/exercises/squat.webp";
  if (/بربيز|burpee/i.test(n)) return "/exercises/burpee.webp";
  if (/بلانك|plank/i.test(n)) return "/exercises/plank.webp";
  return "/exercises/pushup.webp";
}

export const pad = (n: number) => String(n).padStart(2, "0");

export function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function shiftDay(key: string, amount: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + amount);
  return dayKey(date);
}

export const WEEKDAYS = ["الأحد", "الاتنين", "التلات", "الأربع", "الخميس", "الجمعة", "السبت"];

export function dayLabel(key: string, long = true): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ar-EG", {
    weekday: long ? "long" : "short",
    day: "numeric",
    month: "long",
  });
}

export function weekdayShort(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

export function lastDays(count: number, end = dayKey()): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(shiftDay(end, -i));
  return out;
}

export function repsOf(state: AppState, id: number, day: string): number {
  const value = state.logs[day]?.[String(id)];
  return typeof value === "number" ? value : 0;
}

export function activeExercises(state: AppState): Exercise[] {
  return state.exercises.filter((e) => !e.archived);
}

export function summarize(state: AppState, day: string) {
  const list = activeExercises(state);
  let reps = 0;
  let target = 0;
  let complete = list.length > 0;
  let doneCards = 0;
  for (const ex of list) {
    const value = repsOf(state, ex.id, day);
    reps += value;
    target += ex.target;
    if (value >= ex.target) doneCards++;
    else complete = false;
  }
  return {
    reps,
    target,
    doneCards,
    totalCards: list.length,
    pct: target ? Math.min(100, Math.round((reps / target) * 100)) : 0,
    complete,
  };
}

export function computeStreak(state: AppState): number {
  const key = dayKey();
  let cursor = summarize(state, key).complete ? key : shiftDay(key, -1);
  let count = 0;
  while (summarize(state, cursor).complete && count < 4000) {
    count++;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

export function lifetime(state: AppState): number {
  let total = 0;
  for (const row of Object.values(state.logs)) {
    for (const value of Object.values(row)) total += Number(value) || 0;
  }
  return total;
}

export function monthReps(state: AppState): number {
  const prefix = dayKey().slice(0, 7);
  let total = 0;
  for (const [day, row] of Object.entries(state.logs)) {
    if (day.startsWith(prefix)) for (const value of Object.values(row)) total += Number(value) || 0;
  }
  return total;
}

export function activeDays(state: AppState): number {
  return Object.values(state.logs).filter((row) => Object.values(row).some((v) => Number(v) > 0)).length;
}

export function bestDay(state: AppState): { day: string; reps: number } | null {
  let best: { day: string; reps: number } | null = null;
  for (const [day, row] of Object.entries(state.logs)) {
    const reps = Object.values(row).reduce((a, v) => a + (Number(v) || 0), 0);
    if (!best || reps > best.reps) best = { day, reps };
  }
  return best?.reps ? best : null;
}

export function levelFor(value: number, target: number): number {
  const ratio = target > 0 ? value / target : 0;
  if (ratio >= 1) return 5;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

export const ACCENTS: Record<Accent, { hex: string; rgb: string; glow: string; name: string }> = {
  volt: { hex: "#c8ff35", rgb: "200,255,53", glow: "rgba(200,255,53,.45)", name: "فولت" },
  orange: { hex: "#ff9a3d", rgb: "255,154,61", glow: "rgba(255,154,61,.45)", name: "برتقالي" },
  sky: { hex: "#4cd7f5", rgb: "76,215,245", glow: "rgba(76,215,245,.45)", name: "سماوي" },
  violet: { hex: "#a78bfa", rgb: "167,139,250", glow: "rgba(167,139,250,.45)", name: "بنفسجي" },
  pink: { hex: "#ff5fb2", rgb: "255,95,178", glow: "rgba(255,95,178,.45)", name: "وردي" },
  rose: { hex: "#ff7a7a", rgb: "255,122,122", glow: "rgba(255,122,122,.45)", name: "مرجاني" },
};

/** Procedural workout tracks — same sound design as the original app. */
export interface TrackConfig {
  name: string;
  emoji: string;
  bpm: number;
  kick: number[];
  hats: number[];
  bass: (number | null)[];
  lead: (number | null)[];
  leadWave: OscillatorType;
  duration: number;
  cover: string;
}

export const TRACKS: Record<string, TrackConfig> = {
  hype: {
    name: "حماس جامد", emoji: "🔥", bpm: 126, kick: [0, 4, 8, 12], hats: [0, 2, 4, 6, 8, 10, 12, 14],
    bass: [55, null, 55, 82.41, 73.42, null, 65.41, 55, 55, null, 55, 98, 82.41, null, 73.42, 65.41],
    lead: [440, null, 523.25, null, 659.25, null, 523.25, 493.88, 440, null, 392, null, 523.25, null, 587.33, null],
    leadWave: "square", duration: 200, cover: "hype",
  },
  beast: {
    name: "وحش الحديد", emoji: "🦾", bpm: 146, kick: [0, 3, 6, 8, 11, 14], hats: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    bass: [49, 49, 49, null, 61.74, null, 55, 49, 49, 49, null, 73.42, 61.74, null, 55, null],
    lead: [587.33, null, 622.25, null, 783.99, 739.99, 622.25, null, 587.33, null, 523.25, null, 587.33, 659.25, null, 783.99],
    leadWave: "sawtooth", duration: 180, cover: "beast",
  },
  focus: {
    name: "فوكس هادي", emoji: "🎧", bpm: 98, kick: [0, 8], hats: [2, 6, 10, 14],
    bass: [65.41, null, null, null, 73.42, null, null, null, 55, null, null, null, 61.74, null, null, null],
    lead: [523.33, null, 587.33, null, 659.25, null, 587.33, null, 523.25, null, 493.88, null, 440, null, 493.88, null],
    leadWave: "triangle", duration: 240, cover: "focus",
  },
};
