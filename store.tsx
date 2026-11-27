"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  STORAGE_KEY, activeExercises, dayKey, defaultState, normalizeState, repsOf,
  type AppState, type CustomTrack, type Exercise, type Reminder,
} from "./fitness";

type ToastKind = "ok" | "warn" | "info" | "party";
export interface ToastItem { id: number; message: string; kind: ToastKind }

interface FitnessApi {
  state: AppState;
  ready: boolean;
  syncing: boolean;
  toasts: ToastItem[];
  toast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
  addReps: (exercise: Exercise, amount: number) => void;
  setReps: (exercise: Exercise, value: number) => void;
  addExercise: (data: Omit<Exercise, "id" | "archived">) => void;
  updateExercise: (id: number, patch: Partial<Exercise>) => void;
  archiveExercise: (id: number) => void;
  deleteExercise: (id: number) => void;
  updateReminder: (patch: Partial<Reminder>) => void;
  setMusicTrack: (track: string) => void;
  setMusicVolume: (volume: number) => void;
  addCustomTrack: (track: CustomTrack) => void;
  removeCustomTrack: (id: string) => void;
  importState: (data: unknown) => boolean;
  resetAll: () => void;
}

const FitnessContext = createContext<FitnessApi | null>(null);

export function FitnessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const stateRef = useRef(state);
  const volumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId = useRef(0);
  stateRef.current = state;

  const dismissToast = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const toast = useCallback((message: string, kind: ToastKind = "ok") => {
    const id = ++toastId.current;
    setToasts((list) => [...list.slice(-3), { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3400);
  }, []);

  useEffect(() => {
    let local: AppState | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) local = normalizeState(JSON.parse(raw));
    } catch { /* corrupted legacy data falls back to cloud/defaults */ }

    const finish = (initial: AppState) => {
      stateRef.current = initial;
      setState(initial);
      setReady(true);
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial)); } catch { /* quota */ }
    };

    finish(local ?? defaultState());
  }, []);

  const commit = useCallback((next: AppState, _event?: { id: number; name: string; amount: number; unit: string }) => {
    stateRef.current = next;
    setState(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* quota */ }
    // All workout data is stored locally in the browser; no database setup is required.
  }, []);

  const addReps = useCallback((exercise: Exercise, amount: number) => {
    if (!Number.isFinite(amount) || amount === 0) return;
    const next: AppState = {
      ...stateRef.current,
      logs: { ...stateRef.current.logs },
    };
    const day = dayKey();
    const row = { ...(next.logs[day] || {}) };
    const key = String(exercise.id);
    const updated = Math.max(0, Math.min(100000, Math.round((row[key] || 0) + amount)));
    row[key] = updated;
    next.logs[day] = row;
    commit(next, { id: exercise.id, name: exercise.name, amount, unit: exercise.unit });
    const done = updated >= exercise.target;
    toast(done ? `🔥 ${exercise.name} — الهدف اتحقق!` : `+${amount} ${exercise.unit} · ${exercise.name}`, done ? "party" : "ok");
  }, [commit, toast]);

  const setReps = useCallback((exercise: Exercise, value: number) => {
    const next: AppState = { ...stateRef.current, logs: { ...stateRef.current.logs } };
    const day = dayKey();
    const row = { ...(next.logs[day] || {}) };
    row[String(exercise.id)] = Math.max(0, Math.min(100000, Math.round(value)));
    next.logs[day] = row;
    commit(next);
  }, [commit]);

  const addExercise = useCallback((data: Omit<Exercise, "id" | "archived">) => {
    const current = stateRef.current;
    const next: AppState = {
      ...current,
      exercises: [...current.exercises, { ...data, id: current.nextId, archived: false }],
      nextId: current.nextId + 1,
    };
    commit(next);
    toast("تمت إضافة التمرين ✔");
  }, [commit, toast]);

  const updateExercise = useCallback((id: number, patch: Partial<Exercise>) => {
    const current = stateRef.current;
    commit({ ...current, exercises: current.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
    toast("تم حفظ التعديلات ✔");
  }, [commit, toast]);

  const archiveExercise = useCallback((id: number) => {
    const current = stateRef.current;
    commit({ ...current, exercises: current.exercises.map((e) => (e.id === id ? { ...e, archived: !e.archived } : e)) });
    toast("تم تحديث الكارت ✔");
  }, [commit, toast]);

  const deleteExercise = useCallback((id: number) => {
    const current = stateRef.current;
    const logs: AppState["logs"] = {};
    for (const [day, row] of Object.entries(current.logs)) {
      const copy = { ...row };
      delete copy[String(id)];
      logs[day] = copy;
    }
    commit({ ...current, exercises: current.exercises.filter((e) => e.id !== id), logs });
    toast("تم حذف التمرين وسجله", "warn");
  }, [commit, toast]);

  const updateReminder = useCallback((patch: Partial<Reminder>) => {
    commit({ ...stateRef.current, reminder: { ...stateRef.current.reminder, ...patch } });
  }, [commit]);

  const setMusicTrack = useCallback((musicTrack: string) => commit({ ...stateRef.current, musicTrack }), [commit]);
  const setMusicVolume = useCallback((volume: number) => {
    const next = { ...stateRef.current, volume: Math.max(0, Math.min(100, Math.round(volume))) };
    stateRef.current = next;
    setState(next);
    if (volumeTimer.current) clearTimeout(volumeTimer.current);
    volumeTimer.current = setTimeout(() => commit({ ...stateRef.current }), 240);
  }, [commit]);

  const addCustomTrack = useCallback((track: CustomTrack) => {
    const current = stateRef.current;
    commit({ ...current, customTracks: [...(current.customTracks || []), track], musicTrack: track.id });
    toast("الأغنية اتضافت ✔", "ok");
  }, [commit, toast]);

  const removeCustomTrack = useCallback((id: string) => {
    const current = stateRef.current;
    const customTracks = (current.customTracks || []).filter((t) => t.id !== id);
    commit({
      ...current,
      customTracks,
      musicTrack: current.musicTrack === id ? "hype" : current.musicTrack,
    });
    toast("الأغنية اتشالت", "warn");
  }, [commit, toast]);

  const importState = useCallback((data: unknown) => {
    try {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (!parsed || typeof parsed !== "object" || !("exercises" in parsed) || !("logs" in parsed)) return false;
      const imported = normalizeState(parsed);
      commit(imported);
      toast("تم استيراد البيانات بنجاح ✔");
      return true;
    } catch {
      toast("الملف غير صالح", "warn");
      return false;
    }
  }, [commit, toast]);

  const resetAll = useCallback(() => {
    commit(defaultState());
    toast("اتصفّر كل حاجة", "warn");
  }, [commit, toast]);

  return (
    <FitnessContext.Provider value={{
      state, ready, syncing: false, toasts, toast, dismissToast, addReps, setReps, addExercise,
      updateExercise, archiveExercise, deleteExercise, updateReminder, setMusicTrack,
      setMusicVolume, addCustomTrack, removeCustomTrack, importState, resetAll,
    }}>
      {children}
    </FitnessContext.Provider>
  );
}

export function useFitness() {
  const ctx = useContext(FitnessContext);
  if (!ctx) throw new Error("useFitness must be used inside FitnessProvider");
  return ctx;
}

/** Convenience hook for one exercise's value in the selected day. */
export function useExerciseValue(exercise: Exercise, day = dayKey()) {
  const { state } = useFitness();
  return repsOf(state, exercise.id, day);
}

export function useActiveExercises() {
  const { state } = useFitness();
  return activeExercises(state);
}
