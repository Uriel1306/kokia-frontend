import { AnimatePresence, motion } from 'motion/react';
import { Archive, ChevronDown, ChevronUp, ListMusic, Play, Pause, Save } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { Recording } from '../types';
import AudioPlayer from './Common/AudioPlayer';

interface ArchiveSectionProps {
  scenarios: Recording[];
  groupedRecordings: { [key: string]: Recording[] };
  expandedGroups: string[];
  toggleGroup: (freq: string) => void;
  archiveSearchQueries: { [key: string]: string };
  setArchiveSearchQueries: Dispatch<SetStateAction<{ [key: string]: string }>>;
  currentlyPlaying: string | null;
  playRecording: (recording: Recording) => void;
  formatTime: (seconds: number) => string;
}

export default function ArchiveSection({
  scenarios,
  groupedRecordings,
  expandedGroups,
  toggleGroup,
  archiveSearchQueries,
  setArchiveSearchQueries,
  currentlyPlaying,
  playRecording,
  formatTime,
}: ArchiveSectionProps) {
  return (
    <motion.div
      key="archive"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 font-brand">ארכיון הקלטות</h1>
        <p className="text-slate-500">נהל את ההקלטות והתרחישים המאוחדים שלך</p>
      </header>

      <div className="space-y-6">
        {scenarios.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <button
              onClick={() => toggleGroup('scenarios_group')}
              className="w-full px-6 py-5 flex items-center justify-between bg-indigo-50/30 hover:bg-indigo-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                  <ListMusic className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-lg text-slate-900">תרחישים מאוחדים</h3>
                  <p className="text-xs text-slate-500">{scenarios.length} תרחישים שמורים</p>
                </div>
              </div>
              {expandedGroups.includes('scenarios_group') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            <AnimatePresence>
              {expandedGroups.includes('scenarios_group') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-slate-100"
                >
                  <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="relative max-w-md">
                      <input
                        type="text"
                        placeholder="חפש תרחיש..."
                        value={archiveSearchQueries['scenarios_group'] || ''}
                        onChange={(e) => setArchiveSearchQueries(prev => ({ ...prev, scenarios_group: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Archive className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scenarios
                      .filter(rec => !archiveSearchQueries['scenarios_group'] || rec.name.toLowerCase().includes(archiveSearchQueries['scenarios_group'].toLowerCase()))
                      ?.map(rec => (
                        <div key={rec.id} className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100 hover:border-blue-200 transition-all group">
                          <AudioPlayer
                            isPlaying={currentlyPlaying === rec.id}
                            onToggle={() => playRecording(rec)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                              currentlyPlaying === rec.id
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-slate-600 border border-slate-200 hover:text-blue-600 hover:border-blue-300'
                            }`}
                            label={currentlyPlaying === rec.id ? 'עצור השמעה' : 'הפעל תרחיש'}
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-slate-900 truncate">{rec.name}</h3>
                            <p className="text-xs text-slate-500 mt-1">{formatTime(rec.duration)}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {Object.keys(groupedRecordings).length === 0 && scenarios.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400">
            <Archive className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>אין עדיין הקלטות או תרחישים שמורים.</p>
          </div>
        ) : (
          (Object.entries(groupedRecordings || {}) as [string, Recording[]][]).map(([freq, items]) => (
            <div key={freq} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
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
                    <p className="text-xs text-slate-500">{items.length} הקלטות</p>
                  </div>
                </div>
                {expandedGroups.includes(freq) ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>

              <AnimatePresence>
                {expandedGroups.includes(freq) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {(items || []).map(rec => (
                      <div key={rec.id} className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100 hover:border-blue-200 transition-all group">
                        <AudioPlayer
                          isPlaying={currentlyPlaying === rec.id}
                          onToggle={() => playRecording(rec)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            currentlyPlaying === rec.id
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'bg-white text-slate-600 border border-slate-200 hover:text-blue-600 hover:border-blue-300'
                          }`}
                          label={currentlyPlaying === rec.id ? 'עצור השמעה' : 'הפעל הקלטה'}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900 truncate">{rec.name}</h3>
                          <p className="text-xs text-slate-500 mt-1">{formatTime(rec.duration)}</p>
                        </div>
                        <button className="p-2 text-slate-400 hover:text-blue-500 transition-all" type="button">
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
