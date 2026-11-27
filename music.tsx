"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { audioEngine } from "./audio";
import { TRACKS, type CustomTrack } from "./fitness";
import { useFitness } from "./store";
import { deleteAudioFile, getAudioFile, saveAudioFile } from "./tracks-db";

interface MusicApi {
  playing: boolean;
  loading: boolean;
  track: string;
  elapsed: number;
  duration: number;
  volume: number;
  customTracks: CustomTrack[];
  toggle: () => void;
  playTrack: (key: string) => Promise<void>;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  addFileTrack: (file: File, name?: string) => Promise<void>;
  addUrlTrack: (name: string, url: string) => Promise<void>;
  removeTrack: (id: string) => void;
}

const MusicContext = createContext<MusicApi | null>(null);
const objectUrls = new Map<string, string>();

export function MusicProvider({ children }: { children: ReactNode }) {
  const { state, setMusicTrack, setMusicVolume, addCustomTrack, removeCustomTrack, toast } = useFitness();
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [nativeDuration, setNativeDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const customTracks = state.customTracks || [];
  const volume = state.volume ?? 65;
  const track = state.musicTrack && (TRACKS[state.musicTrack] || state.musicTrack.startsWith("custom:"))
    ? state.musicTrack
    : "hype";
  const isCustom = track.startsWith("custom:");
  const duration = isCustom ? (nativeDuration > 0 ? nativeDuration : 180) : (TRACKS[track] ?? TRACKS.hype).duration;
  const trackRef = useRef(track);
  trackRef.current = track;
  const stateRef = useRef(state);
  stateRef.current = state;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = volumeRef.current / 100;
    audio.addEventListener("timeupdate", () => setElapsed(audio.currentTime));
    audio.addEventListener("loadedmetadata", () => setNativeDuration(Number.isFinite(audio.duration) ? audio.duration : 0));
    audio.addEventListener("ended", () => setPlaying(false));
    audio.addEventListener("error", () => {
      setPlaying(false);
      toast("مش قادر أشغّل الملف — جرّب رابط أو ملف صوتي مختلف", "warn");
    });
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, [toast]);

  useEffect(() => {
    audioEngine.setVolume(volume / 100);
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) audio.pause();
    if (!track.startsWith("custom:") && audioEngine.track !== track) audioEngine.switchTrack(track);
    setNativeDuration(0);
  }, [track]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const current = trackRef.current.startsWith("custom:")
        ? audioRef.current?.currentTime ?? 0
        : audioEngine.elapsed();
      setElapsed(current);
    }, 500);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => () => audioEngine.pause(), []);

  const stopAll = useCallback(() => {
    audioEngine.pause();
    audioRef.current?.pause();
  }, []);

  const prepare = useCallback(async (key: string): Promise<boolean> => {
    const audio = audioRef.current;
    if (!audio) return false;
    if (!key.startsWith("custom:")) return true;
    const meta = (stateRef.current.customTracks || []).find((t) => t.id === key);
    if (!meta) return false;
    let src = "";
    if (meta.source === "url") {
      src = meta.url || "";
    } else {
      src = objectUrls.get(meta.id) || "";
      if (!src) {
        const blob = await getAudioFile(meta.id);
        if (!blob) return false;
        src = URL.createObjectURL(blob);
        objectUrls.set(meta.id, src);
      }
    }
    if (!src) return false;
    if (audio.src !== src) {
      audio.src = src;
      audio.load();
    }
    return true;
  }, []);

  const playTrack = useCallback(async (key: string) => {
    setLoading(true);
    try {
      stopAll();
      setMusicTrack(key);
      const ready = await prepare(key);
      if (!ready) {
        toast("الملف غير متاح — أضفه مرة أخرى", "warn");
        setPlaying(false);
        return;
      }
      if (key.startsWith("custom:")) {
        await audioRef.current!.play();
      } else {
        await audioEngine.play(key);
      }
      setElapsed(0);
      setPlaying(true);
    } catch {
      toast("تعذّر تشغيل هذا المصدر", "warn");
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }, [prepare, setMusicTrack, stopAll, toast]);

  const toggle = useCallback(() => {
    if (playing) {
      stopAll();
      setPlaying(false);
      return;
    }
    if (elapsed > 1) {
      void (async () => {
        try {
          const ready = await prepare(trackRef.current);
          if (!ready) return;
          if (trackRef.current.startsWith("custom:") && audioRef.current) audioRef.current.currentTime = elapsed;
          else audioEngine.seek(elapsed);
          if (trackRef.current.startsWith("custom:")) await audioRef.current!.play();
          else await audioEngine.play(trackRef.current);
          setPlaying(true);
        } catch { setPlaying(false); }
      })();
      return;
    }
    void playTrack(trackRef.current);
  }, [elapsed, playTrack, playing, prepare, stopAll]);

  const order = [...Object.keys(TRACKS), ...customTracks.map((t) => t.id)];
  const next = useCallback(() => {
    const i = order.indexOf(trackRef.current);
    void playTrack(order[(i + 1) % order.length]);
  }, [order.join("|"), playTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  const prev = useCallback(() => {
    const i = order.indexOf(trackRef.current);
    void playTrack(order[(i - 1 + order.length) % order.length]);
  }, [order.join("|"), playTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  const seek = useCallback((seconds: number) => {
    if (trackRef.current.startsWith("custom:")) {
      if (audioRef.current) audioRef.current.currentTime = seconds;
    } else {
      audioEngine.seek(seconds);
    }
    setElapsed(seconds);
  }, []);

  const setVolume = useCallback((value: number) => setMusicVolume(Math.round(value)), [setMusicVolume]);

  const addFileTrack = useCallback(async (file: File, name?: string) => {
    setLoading(true);
    try {
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await saveAudioFile(id, file);
      addCustomTrack({
        id,
        name: (name || file.name).replace(/\.[^.]+$/, "").slice(0, 80),
        source: "file",
        mime: file.type || "audio/mpeg",
      });
      await playTrack(id);
    } catch {
      toast("فشل حفظ الأغنية على الجهاز", "warn");
    } finally {
      setLoading(false);
    }
  }, [addCustomTrack, playTrack, toast]);

  const addUrlTrack = useCallback(async (name: string, url: string) => {
    const clean = url.trim();
    try {
      const parsed = new URL(clean);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
    } catch {
      toast("اكتب رابط صوتي صحيح يبدأ بـ https", "warn");
      return;
    }
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    addCustomTrack({ id, name: name.trim().slice(0, 80) || "أغنيتي", source: "url", url: clean });
    await playTrack(id);
  }, [addCustomTrack, playTrack, toast]);

  const removeTrack = useCallback((id: string) => {
    if (trackRef.current === id) {
      stopAll();
      setPlaying(false);
      setElapsed(0);
    }
    const url = objectUrls.get(id);
    if (url) { URL.revokeObjectURL(url); objectUrls.delete(id); }
    void deleteAudioFile(id).catch(() => undefined);
    removeCustomTrack(id);
  }, [removeCustomTrack, stopAll]);

  return (
    <MusicContext.Provider value={{
      playing, loading, track, elapsed, duration, volume, customTracks, toggle, playTrack,
      next, prev, seek, setVolume, addFileTrack, addUrlTrack, removeTrack,
    }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used inside MusicProvider");
  return ctx;
}
