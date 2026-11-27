"use client";

import { useRef, useState } from "react";
import {
  FileAudio, Link2, LoaderCircle, Music2, Pause, Play, Plus, SkipBack,
  SkipForward, Trash2, Volume2, VolumeX, X,
} from "lucide-react";
import { TRACKS } from "@/lib/fitness";
import { useMusic } from "@/lib/music";

const fmt = (s: number) => {
  const total = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export function MusicPlayer() {
  const {
    playing, loading, track, elapsed, duration, volume, customTracks,
    toggle, playTrack, next, prev, seek, setVolume,
    addFileTrack, addUrlTrack, removeTrack,
  } = useMusic();
  const [showAdd, setShowAdd] = useState(false);
  const [mode, setMode] = useState<"file" | "url">("file");
  const [songName, setSongName] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cfg = TRACKS[track];
  const custom = customTracks.find((t) => t.id === track);
  const title = cfg?.name || custom?.name || "أغنيتي";
  const emoji = cfg?.emoji || "🎵";
  const coverClass = cfg ? `cover-${cfg.cover}` : "cover-custom";
  const position = Math.min(elapsed % Math.max(1, duration), duration);

  const submit = async () => {
    if (mode === "file") {
      if (!file) return;
      await addFileTrack(file, songName || file.name);
    } else {
      if (!songUrl.trim()) return;
      await addUrlTrack(songName || "أغنيتي", songUrl);
    }
    setFile(null);
    setSongName("");
    setSongUrl("");
    setShowAdd(false);
  };

  return (
    <section className={`glass player-card ${playing ? "spinning" : ""}`} aria-label="مشغل الموسيقى">
      <div className="player-row">
        <div className={`cover-3d ${coverClass}`}>
          <div className="vinyl" />
          <div className="cover-art" />
          <div className="cover-label">{emoji}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="eyebrow !text-[10px]">Now Playing</span>
            <div className={`eq ${playing ? "" : "opacity-30"}`}>{[0, 1, 2, 3, 4].map((i) => <i key={i} />)}</div>
            {!cfg && <span className="chip !py-1 !text-[9px]">أغنيتك الحقيقية 🎶</span>}
          </div>
          <h3 className="mt-1 truncate text-xl font-black leading-tight">{title}</h3>
          <p className="muted truncate">{cfg ? `إيقاع مولّد داخل المتصفح · ${cfg.bpm} BPM` : custom?.source === "url" ? "بث مباشر من رابط صوتي" : "ملف صوتي من جهازك — تشغيل حقيقي"}</p>
          <div className="mt-3 flex items-center gap-2">
            <input
              className="range" type="range" min={0} max={Math.max(1, duration)} value={position}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="تقدم المقطع"
              style={{ background: `linear-gradient(90deg, #c8ff35 ${(position / Math.max(1, duration)) * 100}%, rgba(4,8,18,.8) ${(position / Math.max(1, duration)) * 100}%)` }}
            />
            <span className="text-[10px] font-extrabold tabular-nums text-white/60">{fmt(position)} / {fmt(duration)}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button className="icon-btn !h-10 !w-10" onClick={prev} aria-label="المقطع السابق"><SkipBack size={17} /></button>
            <button className="btn-3d !h-11 !min-w-[92px] !rounded-2xl" onClick={toggle} aria-label={playing ? "إيقاف الموسيقى" : "تشغيل الموسيقى"}>
              {loading ? <LoaderCircle size={17} className="animate-spin" /> : playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
              {playing ? "إيقاف" : "تشغيل"}
            </button>
            <button className="icon-btn !h-10 !w-10" onClick={next} aria-label="المقطع التالي"><SkipForward size={17} /></button>
            <div className="mr-auto flex items-center gap-2">
              <button className="icon-btn !h-9 !w-9" onClick={() => setVolume(volume > 0 ? 0 : 65)} aria-label="كتم الصوت">
                {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input className="range !w-20" type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="مستوى الصوت" />
              <span className="text-[10px] font-extrabold text-white/50 tabular-nums">{volume}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="muted !text-[11px]">مكتبتك الموسيقية · {customTracks.length} أغنية مضافة</p>
        <button className="btn-3d btn-violet btn-sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? <X size={14} /> : <Plus size={14} />} {showAdd ? "إغلاق" : "أضف أغنيتك"}
        </button>
      </div>

      {showAdd && (
        <div className="mt-3 rounded-2xl border border-violet-400/25 bg-black/25 p-3">
          <div className="mb-3 flex gap-2">
            <button className={`chip ${mode === "file" ? "active" : ""}`} onClick={() => setMode("file")}><FileAudio size={12} /> ملف من جهازك</button>
            <button className={`chip ${mode === "url" ? "active" : ""}`} onClick={() => setMode("url")}><Link2 size={12} /> رابط أغنية</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input !min-h-10" placeholder="اسم الأغنية (اختياري)" value={songName} onChange={(e) => setSongName(e.target.value)} />
            {mode === "file" ? (
              <button className="btn-3d btn-dark !min-h-10" onClick={() => fileRef.current?.click()}>
                <FileAudio size={14} /> {file ? file.name.slice(0, 28) : "اختر ملف MP3 / WAV / M4A"}
              </button>
            ) : (
              <input className="input !min-h-10 text-left" dir="ltr" placeholder="https://example.com/song.mp3" value={songUrl} onChange={(e) => setSongUrl(e.target.value)} />
            )}
          </div>
          <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="btn-3d btn-sm mt-3 w-full" disabled={loading || (mode === "file" ? !file : !songUrl.trim())} onClick={submit}>
            {loading ? <LoaderCircle size={14} className="animate-spin" /> : <Music2 size={14} />} إضافة وتشغيل
          </button>
          <p className="muted mt-2 !text-[10px]">الملفات تُحفظ على جهازك وتعمل بدون إنترنت. الرابط يجب أن يشير مباشرة لملف صوتي.</p>
        </div>
      )}

      <div className="track-list">
        {Object.entries(TRACKS).map(([key, item]) => (
          <button key={key} className={`chip transition ${key === track ? "active" : "hover:!text-white"}`} onClick={() => void playTrack(key)}>
            {item.emoji} {item.name} <span className="opacity-50">{item.bpm}</span>
          </button>
        ))}
        {customTracks.map((item) => (
          <span key={item.id} className={`chip gap-1 !pr-1 ${item.id === track ? "active" : ""}`}>
            <button className="flex items-center gap-1" onClick={() => void playTrack(item.id)}>
              🎵 <span className="max-w-[110px] truncate">{item.name}</span>
            </button>
            <button className="grid h-5 w-5 place-items-center rounded-md text-white/40 hover:bg-red-500/20 hover:text-red-300" onClick={() => removeTrack(item.id)} aria-label={`حذف ${item.name}`}>
              <Trash2 size={11} />
            </button>
          </span>
        ))}
      </div>
    </section>
  );
}

export function MiniPlayer() {
  const { playing, track, elapsed, duration, toggle, next, seek } = useMusic();
  const cfg = TRACKS[track];
  const position = Math.min(elapsed % Math.max(1, duration), duration);
  const name = cfg?.name || "أغنيتي 🎵";
  return (
    <div className={`mini-player ${playing ? "spinning" : ""}`}>
      <div className={`mini-cover ${cfg ? `cover-${cfg.cover}` : "cover-custom"}`}>{cfg?.emoji || "🎵"}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Music2 size={12} className="text-violet-300" />
          <span className="mini-track-name">{name}</span>
          {playing && <div className="eq !h-3">{[0, 1, 2, 3].map((i) => <i key={i} />)}</div>}
        </div>
        <input
          className="range !mt-2 !h-[4px]" type="range" min={0} max={Math.max(1, duration)} value={position}
          onChange={(e) => seek(Number(e.target.value))} aria-label="تقدم المقطع"
          style={{ background: `linear-gradient(90deg, #a78bfa ${(position / Math.max(1, duration)) * 100}%, rgba(4,8,18,.8) ${(position / Math.max(1, duration)) * 100}%)` }}
        />
      </div>
      <button className="icon-btn !h-9 !w-9" onClick={next} aria-label="المقطع التالي"><SkipForward size={15} /></button>
      <button className="icon-btn on !h-10 !w-10" onClick={toggle} aria-label={playing ? "إيقاف" : "تشغيل"}>
        {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
      </button>
    </div>
  );
}
