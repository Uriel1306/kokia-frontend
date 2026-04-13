import { AnimatePresence, motion, Reorder } from 'motion/react';
import { Archive, Clock, ListMusic, Radio, GripVertical, Trash2, Save, Play, Pause } from 'lucide-react';
import type { Dispatch, MouseEvent, SetStateAction } from 'react';
import { Recording, Timeline, TimelineItem } from '../types';
import ProgressBar from './Common/ProgressBar';
import ConflictModal from './Modals/ConflictModal';
import NamingModal from './Modals/NamingModal';
import TimelineTrack from './timeline/TimelineTrack';
import AudioProgress from './shared/AudioProgress';

interface TimelineSectionProps {
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  timelines: Timeline[];
  newTimelineName: string;
  setNewTimelineName: Dispatch<SetStateAction<string>>;
  newTimelineFrequency: string;
  setNewTimelineFrequency: Dispatch<SetStateAction<string>>;
  addTimeline: () => void;
  updateTimelineSearch: (timelineId: string, updates: Partial<Pick<Timeline, 'searchQuery' | 'sortMethod' | 'selectedRecordingId'>>) => void;
  getSortedRecordings: (query?: string, sortMethod?: string) => Recording[];
  recordings: Recording[];
  addItemToTimeline: (timelineId: string, item: Omit<TimelineItem, 'id'>) => void;
  removeItemFromTimeline: (timelineId: string, itemId: string) => void;
  updateDelayDuration: (timelineId: string, itemId: string, newDuration: number) => void;
  reorderTimelineItems: (timelineId: string, newItems: TimelineItem[]) => void;
  removeTimeline: (timelineId: string) => void;
  mergingStatus: 'idle' | 'merging' | 'preview' | 'done';
  mergeTimelines: (autoFix?: boolean) => Promise<void>;
  mergedTimeline: TimelineItem[];
  previewCurrentTime: number;
  previewTotalDuration: number;
  previewIndex: number;
  isPreviewPlaying: boolean;
  playPreview: (startTime?: number) => Promise<void>;
  finalizeMerge: () => void;
  handleProgressBarClick: (event: MouseEvent<HTMLDivElement>) => void;
  showConflictModal: boolean;
  setShowConflictModal: Dispatch<SetStateAction<boolean>>;
  showNamingModal: boolean;
  setShowNamingModal: Dispatch<SetStateAction<boolean>>;
  scenarioName: string;
  setScenarioName: Dispatch<SetStateAction<string>>;
  confirmFinalizeMerge: () => Promise<void>;
  cancelPreview: () => void;
  formatFrequencyForDisplay: (freq: string | undefined) => string;
  formatTime: (seconds: number) => string;
}

export default function TimelineSection({
  error,
  setError,
  timelines,
  newTimelineName,
  setNewTimelineName,
  newTimelineFrequency,
  setNewTimelineFrequency,
  addTimeline,
  updateTimelineSearch,
  getSortedRecordings,
  recordings,
  addItemToTimeline,
  removeItemFromTimeline,
  updateDelayDuration,
  reorderTimelineItems,
  removeTimeline,
  mergingStatus,
  mergeTimelines,
  mergedTimeline,
  previewCurrentTime,
  previewTotalDuration,
  previewIndex,
  isPreviewPlaying,
  playPreview,
  finalizeMerge,
  handleProgressBarClick,
  showConflictModal,
  setShowConflictModal,
  showNamingModal,
  setShowNamingModal,
  scenarioName,
  setScenarioName,
  confirmFinalizeMerge,
  cancelPreview,
  formatFrequencyForDisplay,
  formatTime,
}: TimelineSectionProps) {
  return (
    <motion.div
      key="scenarios"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 font-brand">יצירת תרחיש</h1>
        <p className="text-slate-500">בנה צירי זמן מורכבים ושלב הקלטות</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold">ניהול צירי זמן</h2>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                value={newTimelineName}
                onChange={(e) => setNewTimelineName(e.target.value)}
                placeholder="שם ציר זמן (למשל: גדודי)"
                className="w-full md:w-48 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="relative w-full md:w-40">
                <input
                  type="number"
                  step="0.025"
                  value={newTimelineFrequency}
                  onChange={(e) => setNewTimelineFrequency(e.target.value)}
                  placeholder="תדר (MHz)"
                  className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 pl-8 ${
                    error ? 'border-red-300 ring-red-100' : 'border-slate-200 focus:ring-blue-500'
                  }`}
                />
                <Radio className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              </div>
              <button
                onClick={addTimeline}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-all whitespace-nowrap w-full md:w-auto"
              >
                הוסף ציר זמן
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
            >
              <div className="p-1 bg-red-100 rounded-full mt-0.5">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-red-800">{error}</p>
                <p className="text-xs text-red-600">
                  התדר חייב להיות בטווח של 33.000 עד 87.975 MHz, ובקפיצות של 25 kHz (למשל: 33.025, 33.050).
                </p>
              </div>
            </motion.div>
          )}

          <div className="space-y-8">
            {timelines.length === 0 ? (
              <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                <p>טרם נוצרו צירי זמן. הוסף אחד כדי להתחיל.</p>
              </div>
            ) : (
              (timelines || []).map(tl => (
                <div key={tl.id} className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg text-slate-800">{tl.name}</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {formatFrequencyForDisplay(tl.frequency)} MHz
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                      <span className="text-xs font-bold text-slate-500 mr-1">הוספת הקלטה לציר:</span>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 md:w-64">
                          <select
                            className="w-full pl-8 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                            value={tl.selectedRecordingId || ''}
                            onChange={(e) => updateTimelineSearch(tl.id, { selectedRecordingId: e.target.value })}
                          >
                            <option value="">בחר הקלטה...</option>
                            {(getSortedRecordings(tl.searchQuery, tl.sortMethod) || []).map(r => (
                              <option key={r.id} value={r.id}>{r.name} ({r.duration && `${r.duration}s`})</option>
                            ))}
                          </select>
                          <ListMusic className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <button
                          onClick={() => {
                            const rec = recordings.find(r => r.id === tl.selectedRecordingId);
                            if (rec) addItemToTimeline(tl.id, { type: 'recording', recordingId: rec.id, name: rec.name, duration: rec.duration });
                          }}
                          disabled={!tl.selectedRecordingId}
                          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-sm active:scale-95"
                        >
                          הוסף
                        </button>
                      </div>
                    </div>

                    <div className="h-px md:h-10 w-full md:w-px bg-slate-100" />

                    <div className="flex flex-col gap-2 w-full md:w-auto">
                      <span className="text-xs font-bold text-slate-500 mr-1">סינון וחיפוש:</span>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 md:w-48">
                          <input
                            type="text"
                            placeholder="חפש הקלטה..."
                            value={tl.searchQuery || ''}
                            onChange={(e) => {
                              const query = e.target.value;
                              const sorted = getSortedRecordings(query, tl.sortMethod);
                              updateTimelineSearch(tl.id, {
                                searchQuery: query,
                                selectedRecordingId: sorted.length > 0 ? sorted[0].id : '',
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && tl.selectedRecordingId) {
                                const rec = recordings.find(r => r.id === tl.selectedRecordingId);
                                if (rec) addItemToTimeline(tl.id, { type: 'recording', recordingId: rec.id, name: rec.name, duration: rec.duration });
                              }
                            }}
                            className="w-full pl-8 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <Archive className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <select
                          value={tl.sortMethod || 'newest'}
                          onChange={(e) => updateTimelineSearch(tl.id, { sortMethod: e.target.value as any })}
                          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="newest">חדש לישן</option>
                          <option value="oldest">ישן לחדש</option>
                          <option value="alphabetical">א-ב</option>
                          <option value="numerical">מספור שמי</option>
                        </select>
                      </div>
                    </div>

                    <div className="h-px md:h-10 w-full md:w-px bg-slate-100" />

                    <div className="flex items-center gap-2 mt-auto pb-1">
                      <button
                        onClick={() => addItemToTimeline(tl.id, { type: 'delay', duration: 5 })}
                        className="flex items-center gap-2 text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all font-bold"
                      >
                        <Clock className="w-4 h-4" />
                        הוסף השהיה
                      </button>
                      <button
                        onClick={() => removeTimeline(tl.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="מחק ציר זמן"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <Reorder.Group
                    axis="x"
                    values={tl.items || []}
                    onReorder={(newItems) => reorderTimelineItems(tl.id, newItems)}
                    className="flex items-center gap-2 overflow-x-auto py-4 min-h-[140px] custom-scrollbar"
                  >
                    <AnimatePresence mode="popLayout">
                      {(tl.items || []).map((item) => {
                        const itemCount = tl.items.length;
                        const minWidth = itemCount > 8 ? 'min-w-[90px]' : itemCount > 5 ? 'min-w-[110px]' : 'min-w-[140px]';
                        const padding = itemCount > 8 ? 'p-2' : 'p-4';
                        const fontSize = itemCount > 8 ? 'text-xs' : 'text-sm';

                        return (
                          <Reorder.Item
                            key={item.id}
                            value={item}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={`flex-shrink-0 ${padding} rounded-2xl border shadow-sm flex flex-col gap-1 ${minWidth} relative group cursor-grab active:cursor-grabbing select-none transition-all duration-300 ${
                              item.type === 'recording' ? 'bg-white border-blue-100' : 'bg-indigo-50 border-indigo-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                {item.type === 'recording' ? 'הקלטה' : 'השהיה'}
                              </span>
                              <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-400 transition-colors" />
                            </div>
                            <span className={`font-semibold ${fontSize} truncate`}>{item.name || `${item.duration}s`}</span>

                            {item.type === 'delay' ? (
                              <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0.5"
                                    step="0.1"
                                    value={item.duration}
                                    onChange={(e) => updateDelayDuration(tl.id, item.id, parseFloat(e.target.value) || 0.5)}
                                    className={`${itemCount > 8 ? 'w-10' : 'w-16'} px-1 py-0.5 text-[10px] border border-indigo-200 rounded outline-none focus:ring-1 focus:ring-indigo-400`}
                                  />
                                  <span className="text-[9px] text-slate-500">ש'</span>
                                </div>
                                {item.duration >= 60 && itemCount <= 8 && (
                                  <span className="text-[9px] text-indigo-400 font-medium">({item.duration}s)</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">{item.duration}s</span>
                            )}

                            <button
                              onClick={() => removeItemFromTimeline(tl.id, item.id)}
                              className="absolute -top-2 -left-2 bg-white shadow-md rounded-full p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10"
                              type="button"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </Reorder.Item>
                        );
                      })}
                    </AnimatePresence>
                  </Reorder.Group>
                </div>
              ))
            )}
          </div>

          {timelines.length > 0 && mergingStatus !== 'preview' && (
            <div className="pt-8 flex justify-center">
              <button
                onClick={() => mergeTimelines()}
                disabled={mergingStatus === 'merging'}
                className={`flex items-center gap-3 px-12 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95 ${
                  mergingStatus === 'merging'
                    ? 'bg-slate-200 text-slate-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                }`}
                type="button"
              >
                {mergingStatus === 'merging' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    מבצע איחוד...
                  </>
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    איחוד צירי זמן
                  </>
                )}
              </button>
            </div>
          )}

          <AnimatePresence>
            {mergingStatus === 'preview' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-8 border-t border-slate-100 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Play className="w-5 h-5 text-green-600" />
                    </div>
                    <h2 className="text-xl font-semibold">תצוגה מקדימה של האיחוד</h2>
                  </div>
                  <button
                    onClick={cancelPreview}
                    className="text-sm text-slate-400 hover:text-slate-600"
                    type="button"
                  >
                    ביטול
                  </button>
                </div>

                <div className="bg-slate-900 rounded-3xl p-6 overflow-x-auto custom-scrollbar flex items-center gap-1 min-h-[120px]">
                  {(mergedTimeline || []).map((item, idx) => {
                    const startTime = mergedTimeline.slice(0, idx).reduce((acc, it) => acc + it.duration, 0);
                    return (
                      <div key={item.id} className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            playPreview(startTime);
                          }}
                          className={`flex-shrink-0 px-4 py-3 rounded-xl border flex flex-col items-center min-w-[120px] transition-all hover:scale-105 active:scale-95 ${
                            previewIndex === idx ? 'ring-2 ring-green-400 scale-105' : ''
                          } ${
                            item.type === 'recording' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                          type="button"
                        >
                          {item.type === 'recording' ? (
                            <div className="flex flex-col items-center gap-1 w-full text-center">
                              <div className="flex flex-col leading-none">
                                <span className="text-[7px] opacity-80">ציר זמן:</span>
                                <span className="text-[10px] font-bold truncate max-w-[100px]">{item.timelineName}</span>
                              </div>
                              <div className="flex flex-col leading-none">
                                <span className="text-[7px] opacity-80">שם ההקלטה:</span>
                                <span className="text-[10px] font-bold truncate max-w-[100px]">{item.name}</span>
                              </div>
                              <div className="flex flex-col leading-none">
                                <span className="text-[7px] opacity-80">תדר:</span>
                                <span className="text-[10px] font-bold">{formatFrequencyForDisplay(item.frequency)} MHz</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="text-[8px] font-bold uppercase opacity-70">השהיה</span>
                              <span className="text-xs font-semibold">{item.duration}s</span>
                            </>
                          )}
                        </button>
                        {idx < mergedTimeline.length - 1 && <div className="w-4 h-0.5 bg-slate-700" />}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-slate-500 px-1">
                    <span>{formatTime(Math.floor(previewCurrentTime))}</span>
                    <span>{formatTime(Math.floor(previewTotalDuration))}</span>
                  </div>
                  <AudioProgress current={previewCurrentTime} total={previewTotalDuration} onClick={handleProgressBarClick} />
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => playPreview()}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all ${
                      isPreviewPlaying
                        ? 'bg-amber-500 text-white'
                        : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600'
                    }`}
                    type="button"
                  >
                    {isPreviewPlaying ? (
                      <>
                        <Pause className="w-5 h-5" />
                        עצור השמעה
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        השמע תצוגה מקדימה
                      </>
                    )}
                  </button>
                  <button
                    onClick={finalizeMerge}
                    className="bg-green-600 text-white px-12 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-green-200 hover:bg-green-700 transition-all active:scale-95"
                    type="button"
                  >
                    שמור תרחיש
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <ConflictModal show={showConflictModal} setShowConflictModal={setShowConflictModal} mergeTimelines={mergeTimelines} />
      <NamingModal
        show={showNamingModal}
        setShowNamingModal={setShowNamingModal}
        scenarioName={scenarioName}
        setScenarioName={setScenarioName}
        confirmFinalizeMerge={confirmFinalizeMerge}
      />
    </motion.div>
  );
}
