import { AnimatePresence, motion } from "motion/react";
import {
  ListMusic,
  Radio,
  Clock,
  Save,
  Trash2,
  Mic,
  Square,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Recording } from "../types";
import AudioPlayer from "./Common/AudioPlayer";
import RecordingCard from "./recordings/RecordingCard";

interface RecordingSectionProps {
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  isRecording: boolean;
  recordingName: string;
  setRecordingName: Dispatch<SetStateAction<string>>;
  recordingTime: number;
  startRecording: () => void;
  stopRecording: () => void;
  recordings: Recording[];
  currentlyPlaying: string | null;
  playRecording: (recording: Recording) => void;
  editingId: string | null;
  editingField: "title" | null;
  editValue: string;
  setEditValue: Dispatch<SetStateAction<string>>;
  startEditing: (recording: Recording, field: "title") => void;
  saveEdit: (id: string) => void;
  deleteRecording: (id: string) => void;
  downloadRecording: (recording: Recording) => void;
  formatTime: (seconds: number) => string;
}

export default function RecordingSection({
  error,
  setError,
  isRecording,
  recordingName,
  setRecordingName,
  recordingTime,
  startRecording,
  stopRecording,
  recordings,
  currentlyPlaying,
  playRecording,
  editingId,
  editingField,
  editValue,
  setEditValue,
  startEditing,
  saveEdit,
  deleteRecording,
  downloadRecording,
  formatTime,
}: RecordingSectionProps) {
  return (
    <motion.div
      key="recordings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 font-brand">
          יצירת הקלטות
        </h1>
        <p className="text-slate-500">
          נהל את ההקלטות שלך עם פרמטרים מותאמים אישית
        </p>
      </header>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center justify-between"
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 font-bold"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <ListMusic className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold">הקלטה חדשה</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                שם ההקלטה
              </label>
              <input
                type="text"
                value={recordingName}
                onChange={(e) => setRecordingName(e.target.value)}
                placeholder="לדוגמה: בדיקת שטח 1"
                disabled={isRecording}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>

          <div className="pt-6 flex flex-col items-center gap-4">
            <div className="text-4xl font-mono font-medium text-slate-700 tabular-nums">
              {formatTime(recordingTime)}
            </div>

            {!isRecording ? (
              <button
                onClick={startRecording}
                className="group relative flex items-center justify-center w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full transition-all shadow-lg shadow-red-200 active:scale-95"
              >
                <Mic className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                <span className="absolute -bottom-8 text-sm font-medium text-red-500">
                  הקלט
                </span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="group relative flex items-center justify-center w-20 h-20 bg-slate-800 hover:bg-slate-900 rounded-full transition-all shadow-lg shadow-slate-300 active:scale-95"
              >
                <Square className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping" />
                <span className="absolute -bottom-8 text-sm font-medium text-slate-800">
                  עצור
                </span>
              </button>
            )}
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <ListMusic className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold">הקלטות שמורות</h2>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-500 rounded-full">
              {recordings.length} פריטים
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] space-y-4 custom-scrollbar pl-2">
            <AnimatePresence mode="popLayout">
              {recordings.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2"
                >
                  <Radio className="w-12 h-12 opacity-20" />
                  <p>אין הקלטות עדיין</p>
                </motion.div>
              ) : (
                (recordings || []).map((rec) => (
                  <motion.div
                    key={rec.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group bg-slate-50 hover:bg-white hover:shadow-md border border-slate-100 rounded-2xl p-4 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <AudioPlayer
                        isPlaying={currentlyPlaying === rec.id}
                        onToggle={() => playRecording(rec)}
                        className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                          currentlyPlaying === rec.id
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                            : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600"
                        }`}
                        label={
                          currentlyPlaying === rec.id
                            ? "עצור השמעה"
                            : "הפעל הקלטה"
                        }
                      />

                      <div className="flex-1 min-w-0">
                        {editingId === rec.id && editingField === "title" ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full px-2 py-1 border border-blue-300 rounded outline-none text-slate-900 font-semibold"
                              autoFocus
                              onKeyDown={(e) =>
                                e.key === "Enter" && saveEdit(rec.id)
                              }
                            />
                            <button
                              onClick={() => saveEdit(rec.id)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <h3
                            onClick={() => startEditing(rec, "title")}
                            className="font-semibold text-slate-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                            title="לחץ לעריכת שם"
                          >
                            {rec.title}
                          </h3>
                        )}

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(rec.duration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {rec.createdAt}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => downloadRecording(rec)}
                          title="הורד למחשב"
                          className="p-2 text-slate-400 hover:text-blue-500 transition-all"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRecording(rec.id)}
                          title="מחק"
                          className="p-2 text-slate-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
