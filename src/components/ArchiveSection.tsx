import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  ListMusic,
  Save,
  Clock,
  Volume2,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Recording, Timeline } from "../types";
import AudioPlayer from "./Common/AudioPlayer";

interface ArchiveSectionProps {
  recordings: Recording[]; // <--- הוספנו לקבלת שמות ההקלטות
  timelines: Timeline[];
  groupedRecordings: { [key: string]: Recording[] };
  expandedGroups: string[];
  toggleGroup: (freq: string) => void;
  archiveSearchQueries: { [key: string]: string };
  setArchiveSearchQueries: Dispatch<SetStateAction<{ [key: string]: string }>>;
  updateTimelineSearch: (
    updates: Partial<Pick<Timeline, "searchQuery" | "sortMethod">>,
  ) => void;
  currentlyPlaying: string | null;
  playRecording: (recording: Recording) => void;
  playTimeline: (timeline: Timeline) => void;
  formatTime: (seconds: number) => string;
  currentPlaybackTime: number;
}

export default function ArchiveSection({
  recordings, // <--- חילצנו מתוך ה-Props
  timelines,
  groupedRecordings,
  expandedGroups,
  toggleGroup,
  updateTimelineSearch,
  currentlyPlaying,
  playRecording,
  playTimeline,
  formatTime,
  currentPlaybackTime,
}: ArchiveSectionProps) {
  // State מקומי כדי לדעת איזה תרחיש מציג כרגע את הרשימה שלו
  const [expandedTimelines, setExpandedTimelines] = useState<string[]>([]);

  const toggleTimelineDetails = (id: string) => {
    setExpandedTimelines((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id],
    );
  };

  return (
    <motion.div
      key="archive"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 font-brand">
          ארכיון הקלטות
        </h1>
        <p className="text-slate-500">נהל את ההקלטות והתרחישים המאוחדים שלך</p>
      </header>

      <div className="space-y-6">
        {timelines.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <button
              onClick={() => toggleGroup("timelines_group")}
              className="w-full px-6 py-5 flex items-center justify-between bg-indigo-50/30 hover:bg-indigo-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                  <ListMusic className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-lg text-slate-900">
                    תרחישים שמורים
                  </h3>
                  <p className="text-xs text-slate-500">
                    {timelines.length} תרחישים שמורים
                  </p>
                </div>
              </div>
              {expandedGroups.includes("timelines_group") ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            <AnimatePresence>
              {expandedGroups.includes("timelines_group") && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-slate-100"
                >
                  <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative max-w-md">
                        <input
                          type="text"
                          placeholder="חפש תרחיש..."
                          value={timelines[0]?.searchQuery || ""}
                          onChange={(e) =>
                            updateTimelineSearch({
                              searchQuery: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Archive className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                      <div className="relative max-w-md">
                        <select
                          value={timelines[0]?.sortMethod || "newest"}
                          onChange={(e) =>
                            updateTimelineSearch({
                              sortMethod: e.target
                                .value as Timeline["sortMethod"],
                            })
                          }
                          className="w-full pl-4 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="newest">חדש לישן</option>
                          <option value="oldest">ישן לחדש</option>
                          <option value="alphabetical">א-ב</option>
                          <option value="numerical">מספור שמי</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 grid grid-cols-1 gap-4">
                    {timelines
                      .filter(
                        (timeline) =>
                          !timelines[0]?.searchQuery ||
                          timeline.title
                            .toLowerCase()
                            .includes(
                              timelines[0]?.searchQuery?.toLowerCase() || "",
                            ),
                      )
                      .sort((a, b) => {
                        const sortMethod = timelines[0]?.sortMethod || "newest";
                        switch (sortMethod) {
                          case "oldest":
                            return (
                              new Date(a.createdAt).getTime() -
                              new Date(b.createdAt).getTime()
                            );
                          case "alphabetical":
                            return a.title.localeCompare(b.title, "he");
                          case "numerical":
                            return a.title.localeCompare(b.title, undefined, {
                              numeric: true,
                              sensitivity: "base",
                            });
                          case "newest":
                          default:
                            return (
                              new Date(b.createdAt).getTime() -
                              new Date(a.createdAt).getTime()
                            );
                        }
                      })
                      .map((timeline) => {
                        const totalDuration = timeline.sequence.reduce(
                          (acc, item) =>
                            acc +
                            (item.type === "delay"
                              ? item.seconds
                              : (item.duration ?? 0)),
                          0,
                        );
                        const isExpanded = expandedTimelines.includes(
                          timeline.id,
                        );

                        return (
                          <div
                            key={timeline.id}
                            className="relative bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group z-10 overflow-hidden shadow-sm"
                          >
                            {/* האזור העליון (ניתן ללחיצה כדי לפתוח/לסגור) */}
                            <div
                              className="p-4 flex items-center gap-4 cursor-pointer"
                              onClick={() => toggleTimelineDetails(timeline.id)}
                            >
                              {/* עוצרים את בועות הלחיצה כדי שכפתור הפליי לא יפתח/יסגור את הכרטיס */}
                              <div onClick={(e) => e.stopPropagation()}>
                                <AudioPlayer
                                  isPlaying={currentlyPlaying === timeline.id}
                                  onToggle={() => playTimeline(timeline)}
                                  currentTime={
                                    currentlyPlaying === timeline.id
                                      ? currentPlaybackTime
                                      : 0
                                  }
                                  duration={totalDuration}
                                  className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                                    currentlyPlaying === timeline.id
                                      ? "bg-blue-600 text-white shadow-lg"
                                      : "bg-white text-slate-600 border border-slate-200 hover:text-blue-600 hover:border-blue-300"
                                  }`}
                                  label={
                                    currentlyPlaying === timeline.id
                                      ? "עצור תרחיש"
                                      : "הפעל תרחיש"
                                  }
                                />
                              </div>
                              <div className="flex-1 min-w-0 relative z-10">
                                <h3 className="text-sm font-semibold text-slate-900 truncate">
                                  {timeline.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                  {timeline.sequence.length} פריטים ·{" "}
                                  {formatTime(totalDuration)}
                                </p>
                              </div>
                              <div className="p-2 text-slate-400">
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5" />
                                ) : (
                                  <ChevronDown className="w-5 h-5" />
                                )}
                              </div>
                            </div>

                            {/* רשימת הפריטים בתוך התרחיש (נפתחת באנימציה) */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-slate-100 bg-slate-50/50"
                                >
                                  <div className="p-4 flex flex-col gap-2">
                                    {timeline.sequence.map((item, idx) => {
                                      if (item.type === "audio") {
                                        // מציאת שם ההקלטה מתוך הרשימה המקורית
                                        const rec = recordings.find(
                                          (r) => r.id === item.recordingId,
                                        );
                                        const name =
                                          rec?.name ||
                                          item.name ||
                                          "הקלטה לא ידועה";

                                        return (
                                          <div
                                            key={idx}
                                            className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                                <Volume2 className="w-4 h-4" />
                                              </div>
                                              <div>
                                                <p className="text-sm font-semibold text-slate-700">
                                                  <span className="text-slate-400 font-normal ml-1">
                                                    {idx + 1}.
                                                  </span>
                                                  {name}
                                                </p>
                                                { (
                                                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <Archive className="w-3 h-3" />
                                                    מקור:{" "}
                                                    {item.timelineName}
                                                    {/* {JSON.stringify(item)} */}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                            {item.frequency && (
                                              <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                                                {item.frequency}Hz
                                              </span>
                                            )}
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div
                                            key={idx}
                                            className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 border-dashed"
                                          >
                                            <div className="flex items-center gap-3 opacity-70">
                                              <div className="bg-slate-200 p-2 rounded-lg text-slate-600">
                                                <Clock className="w-4 h-4" />
                                              </div>
                                              <div>
                                                <p className="text-sm font-medium text-slate-600">
                                                  <span className="text-slate-400 font-normal ml-1">
                                                    {idx + 1}.
                                                  </span>
                                                  השהיה
                                                </p>
                                              </div>
                                            </div>
                                            <span className="text-xs font-mono text-slate-500 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100">
                                              {item.seconds} שניות
                                            </span>
                                          </div>
                                        );
                                      }
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {Object.keys(groupedRecordings).length === 0 &&
        timelines.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400">
            <Archive className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>אין עדיין הקלטות או תרחישים שמורים.</p>
          </div>
        ) : (
          (
            Object.entries(groupedRecordings || {}) as [string, Recording[]][]
          ).map(([freq, items]) => (
            <div
              key={freq}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md"
            >
              <button
                onClick={() => toggleGroup(freq)}
                className="w-full px-6 py-5 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-lg text-slate-900">{freq}</h3>
                    <p className="text-xs text-slate-500">
                      {items.length} הקלטות
                    </p>
                  </div>
                </div>
                {expandedGroups.includes(freq) ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {expandedGroups.includes(freq) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {(items || []).map((rec) => (
                      <div
                        key={rec.id}
                        className="relative overflow-hidden bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100 hover:border-blue-200 transition-all group z-10"
                      >
                        <AudioPlayer
                          isPlaying={currentlyPlaying === rec.id}
                          onToggle={() => playRecording(rec)}
                          currentTime={
                            currentlyPlaying === rec.id
                              ? currentPlaybackTime
                              : 0
                          }
                          duration={rec.duration}
                          className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                            currentlyPlaying === rec.id
                              ? "bg-blue-600 text-white shadow-lg"
                              : "bg-white text-slate-600 border border-slate-200 hover:text-blue-600 hover:border-blue-300"
                          }`}
                          label={
                            currentlyPlaying === rec.id
                              ? "עצור השמעה"
                              : "הפעל הקלטה"
                          }
                        />
                        <div className="flex-1 min-w-0 relative z-10">
                          <h3 className="text-sm font-semibold text-slate-900 truncate">
                            {rec.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatTime(rec.duration)}
                          </p>
                        </div>
                        <button
                          className="relative z-10 p-2 text-slate-400 hover:text-blue-500 transition-all"
                          type="button"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
