import { useEffect, useState, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { Recording, Timeline, TimelineItem, Tab } from './types';
import { apiService } from './services/api';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useTimelineMerge } from './hooks/useTimelineMerge';
import Sidebar from './components/Sidebar';
import RecordingSection from './components/RecordingSection';
import TimelineSection from './components/TimelineSection';
import ArchiveSection from './components/ArchiveSection';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('recordings');
  const [recordingName, setRecordingName] = useState('');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'name' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [newTimelineName, setNewTimelineName] = useState('');
  const [newTimelineFrequency, setNewTimelineFrequency] = useState('');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [mergingStatus, setMergingStatus] = useState<'idle' | 'merging' | 'preview' | 'done'>('idle');
  const [mergedTimeline, setMergedTimeline] = useState<TimelineItem[]>([]);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(-1);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewTotalDuration, setPreviewTotalDuration] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [archiveSearchQueries, setArchiveSearchQueries] = useState<{ [key: string]: string }>({});

  const isPreviewPlayingRef = useRef(false);

  const { audioRef, isRecording, recordingTime, startRecording, stopRecording } = useAudioRecorder({
    recordingName,
    recordingsCount: recordings.length,
    setRecordings,
    setError,
  });

  useEffect(() => {
    const total = mergedTimeline.reduce((acc, item) => acc + item.duration, 0);
    setPreviewTotalDuration(total);
    setPreviewCurrentTime(0);
  }, [mergedTimeline]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedRecordings, loadedTimelines] = await Promise.all([
          apiService.getRecordings(),
          apiService.getTimelines(),
        ]);

        setRecordings(loadedRecordings.map(rec => ({
          ...rec,
          url: rec.streamUrl ?? `http://localhost:3000/api/recordings/${rec.id}/stream`,
        })));
        setTimelines(loadedTimelines);
      } catch (err) {
        console.error(err);
        setError('לא ניתן לטעון הקלטות או תרחישים מהשרת. אנא נסה מאוחר יותר.');
      }
    };

    loadData();
  }, []);

  const getParsedFrequency = (val: string): number => {
    const normalizedVal = val.replace(',', '.');
    let num = parseFloat(normalizedVal);
    if (!normalizedVal.includes('.') && !isNaN(num) && num > 1000) {
      return num / 1000;
    }
    return num;
  };

  const formatFrequencyForDisplay = (freq: string | undefined) => {
    if (!freq) return '';
    if (freq.includes('.')) return freq;
    const n = parseInt(freq, 10);
    if (isNaN(n)) return freq;
    return (n / 1000).toFixed(3);
  };

  const validateFrequency = (val: string) => {
    const num = getParsedFrequency(val);
    if (isNaN(num)) return 'נא להזין מספר תקין';
    if (num < 33 || num > 87.975) return 'התדר חייב להיות בין 33 ל-87.975 MHz';

    const remainder = Math.round(num * 1000) % 25;
    if (remainder !== 0) return 'התדר חייב להיות בקפיצות של 25 קילו-הרץ (למשל 33.025, 33.050)';

    return null;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playRecording = async (recording: Recording) => {
    if (currentlyPlaying === recording.id) {
      audioRef.current?.pause();
      setCurrentlyPlaying(null);
      isPreviewPlayingRef.current = false;
      setIsPreviewPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setCurrentlyPlaying(recording.id);

    if (recording.sequence && recording.sequence.length > 0) {
      setIsPreviewPlaying(true);
      isPreviewPlayingRef.current = true;

      for (let i = 0; i < recording.sequence.length; i++) {
        const item = recording.sequence[i];
        if (item.type === 'recording') {
          const subRec = recordings.find(r => r.id === item.recordingId);
          if (subRec) {
            const streamUrl = subRec.streamUrl ?? `http://localhost:3000/api/recordings/${subRec.id}/stream`;
            await new Promise((resolve) => {
              const audio = new Audio(streamUrl);
              audioRef.current = audio;
              audio.play();
              audio.onended = resolve;
            });
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, item.duration * 1000));
        }

        if (currentlyPlaying !== recording.id) break;
      }

      if (currentlyPlaying === recording.id) {
        setCurrentlyPlaying(null);
        setIsPreviewPlaying(false);
        isPreviewPlayingRef.current = false;
      }
    } else {
      const streamUrl = recording.streamUrl ?? recording.url ?? `http://localhost:3000/api/recordings/${recording.id}/stream`;
      const audio = new Audio(streamUrl);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => {
        setCurrentlyPlaying(null);
      };
    }
  };

  const deleteRecording = async (id: string) => {
    try {
      await apiService.deleteRecording(id);
      setRecordings(prev => prev.filter(r => r.id !== id));
      if (currentlyPlaying === id) {
        audioRef.current?.pause();
        setCurrentlyPlaying(null);
      }
    } catch (err) {
      console.error(err);
      setError('שגיאה במחיקת ההקלטה. אנא נסה שוב.');
    }
  };

  const downloadRecording = (recording: Recording) => {
    const link = document.createElement('a');
    link.href = recording.url;
    link.download = `${recording.name}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startEditing = (recording: Recording, field: 'name') => {
    setEditingId(recording.id);
    setEditingField(field);
    setEditValue(recording.name);
    setError(null);
  };

  const saveEdit = (id: string) => {
    if (editingField === 'name') {
      if (!editValue.trim()) {
        setError('שם ההקלטה לא יכול להיות ריק');
        return;
      }
      setRecordings(prev => prev.map(r => (r.id === id ? { ...r, name: editValue.trim() } : r)));
    }

    setError(null);
    setEditingId(null);
    setEditingField(null);
  };

  const addTimeline = () => {
    if (!newTimelineName.trim()) return;
    const normalizedFreq = newTimelineFrequency.replace(',', '.');
    const freqError = validateFrequency(normalizedFreq);
    if (freqError) {
      setError(freqError);
      return;
    }
    const num = getParsedFrequency(normalizedFreq);
    const digitFreq = Math.round(num * 1000).toString();
    const newTimeline: Timeline = {
      id: crypto.randomUUID(),
      name: newTimelineName,
      frequency: digitFreq,
      items: [],
      searchQuery: '',
      sortMethod: 'newest',
      selectedRecordingId: '',
    };
    setTimelines([...timelines, newTimeline]);
    setNewTimelineName('');
    setNewTimelineFrequency('');
    setError(null);
  };

  const updateTimelineSearch = (timelineId: string, updates: Partial<Pick<Timeline, 'searchQuery' | 'sortMethod' | 'selectedRecordingId'>>) => {
    setTimelines(prev => prev.map(tl => (tl.id === timelineId ? { ...tl, ...updates } : tl)));
  };

  const addItemToTimeline = (timelineId: string, item: Omit<TimelineItem, 'id'>) => {
    setTimelines(prev => prev.map(tl => {
      if (tl.id === timelineId) {
        const newItems = [...tl.items, { ...item, id: crypto.randomUUID() }];
        if (item.type === 'recording') {
          const possibleDelays = [0.5, 1, 1.5, 2];
          const randomDelay = possibleDelays[Math.floor(Math.random() * possibleDelays.length)];
          newItems.push({
            id: crypto.randomUUID(),
            type: 'delay',
            duration: randomDelay,
            name: 'השהיה אקראית',
          });
        }
        return { ...tl, items: newItems };
      }
      return tl;
    }));
  };

  const removeItemFromTimeline = (timelineId: string, itemId: string) => {
    setTimelines(prev => prev.map(tl => {
      if (tl.id === timelineId) {
        return { ...tl, items: tl.items.filter(i => i.id !== itemId) };
      }
      return tl;
    }));
  };

  const updateDelayDuration = (timelineId: string, itemId: string, newDuration: number) => {
    setTimelines(prev => prev.map(tl => {
      if (tl.id === timelineId) {
        return {
          ...tl,
          items: tl.items.map(item => item.id === itemId ? { ...item, duration: Math.max(0.5, newDuration) } : item),
        };
      }
      return tl;
    }));
  };

  const reorderTimelineItems = (timelineId: string, newItems: TimelineItem[]) => {
    setTimelines(prev => prev.map(tl => (tl.id === timelineId ? { ...tl, items: newItems } : tl)));
  };

  const removeTimeline = (timelineId: string) => {
    setTimelines(prev => prev.filter(tl => tl.id !== timelineId));
  };

  const getSortedRecordings = (query: string = '', sortMethod: string = 'newest') => {
    let filtered = [...recordings];
    if (query) {
      filtered = filtered.filter(r => r.name.toLowerCase().includes(query.toLowerCase()));
    }

    return filtered.sort((a, b) => {
      switch (sortMethod) {
        case 'newest':
          return b.timestamp - a.timestamp;
        case 'oldest':
          return a.timestamp - b.timestamp;
        case 'alphabetical':
          return a.name.localeCompare(b.name, 'he');
        case 'numerical':
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        default:
          return 0;
      }
    });
  };

  const scenarios = recordings.filter(r => r.sequence);
  const regularRecordings = recordings.filter(r => !r.sequence);

  const groupedRecordings = regularRecordings.reduce((acc, rec) => {
    const freq = 'כל ההקלטות';
    if (!acc[freq]) acc[freq] = [];
    acc[freq].push(rec);
    return acc;
  }, {} as { [key: string]: Recording[] });

  const toggleGroup = (freq: string) => {
    setExpandedGroups(prev => (prev.includes(freq) ? prev.filter(f => f !== freq) : [...prev, freq]));
  };

  const cancelPreview = () => {
    audioRef.current?.pause();
    isPreviewPlayingRef.current = false;
    setIsPreviewPlaying(false);
    setPreviewIndex(-1);
    setPreviewCurrentTime(0);
    setMergedTimeline([]);
    setMergingStatus('idle');
  };

  const timelineMerge = useTimelineMerge({
    timelines,
    recordings,
    mergedTimeline,
    setTimelines,
    setMergedTimeline,
    setMergingStatus,
    setShowConflictModal,
    setShowNamingModal,
    setError,
    setPreviewCurrentTime,
    setPreviewIndex,
    setIsPreviewPlaying,
    isPreviewPlayingRef,
    audioRef,
    scenarioName,
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex relative" dir="rtl">
      <div className="absolute top-6 left-8 z-30 pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src="/logo.jpeg"
              alt="Doppler Logo"
              className="w-20 h-20 rounded-full border-4 border-blue-500/30 shadow-2xl object-cover bg-white"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/military/200/200'; }}
            />
            <div className="absolute inset-0 rounded-full ring-2 ring-inset ring-black/10" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 drop-shadow-sm font-brand">
              דופל"ר
            </span>
            <div className="h-1 w-14 bg-blue-600 rounded-full -mt-1" />
          </div>
        </div>
      </div>

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'recordings' ? (
              <RecordingSection
                error={error}
                setError={setError}
                isRecording={isRecording}
                recordingName={recordingName}
                setRecordingName={setRecordingName}
                recordingTime={recordingTime}
                startRecording={startRecording}
                stopRecording={stopRecording}
                recordings={recordings}
                currentlyPlaying={currentlyPlaying}
                playRecording={playRecording}
                editingId={editingId}
                editingField={editingField}
                editValue={editValue}
                setEditValue={setEditValue}
                startEditing={startEditing}
                saveEdit={saveEdit}
                deleteRecording={deleteRecording}
                downloadRecording={downloadRecording}
                formatTime={formatTime}
              />
            ) : activeTab === 'scenarios' ? (
              <TimelineSection
                error={error}
                setError={setError}
                timelines={timelines}
                newTimelineName={newTimelineName}
                setNewTimelineName={setNewTimelineName}
                newTimelineFrequency={newTimelineFrequency}
                setNewTimelineFrequency={setNewTimelineFrequency}
                addTimeline={addTimeline}
                updateTimelineSearch={updateTimelineSearch}
                getSortedRecordings={getSortedRecordings}
                recordings={recordings}
                addItemToTimeline={addItemToTimeline}
                removeItemFromTimeline={removeItemFromTimeline}
                updateDelayDuration={updateDelayDuration}
                reorderTimelineItems={reorderTimelineItems}
                removeTimeline={removeTimeline}
                mergingStatus={mergingStatus}
                mergeTimelines={timelineMerge.mergeTimelines}
                mergedTimeline={mergedTimeline}
                previewCurrentTime={previewCurrentTime}
                previewTotalDuration={previewTotalDuration}
                previewIndex={previewIndex}
                isPreviewPlaying={isPreviewPlaying}
                playPreview={timelineMerge.playPreview}
                finalizeMerge={timelineMerge.finalizeMerge}
                handleProgressBarClick={timelineMerge.handleProgressBarClick}
                showConflictModal={showConflictModal}
                setShowConflictModal={setShowConflictModal}
                showNamingModal={showNamingModal}
                setShowNamingModal={setShowNamingModal}
                scenarioName={scenarioName}
                setScenarioName={setScenarioName}
                confirmFinalizeMerge={timelineMerge.confirmFinalizeMerge}
                cancelPreview={cancelPreview}
                formatFrequencyForDisplay={formatFrequencyForDisplay}
                formatTime={formatTime}
              />
            ) : (
              <ArchiveSection
                scenarios={scenarios}
                groupedRecordings={groupedRecordings}
                expandedGroups={expandedGroups}
                toggleGroup={toggleGroup}
                archiveSearchQueries={archiveSearchQueries}
                setArchiveSearchQueries={setArchiveSearchQueries}
                currentlyPlaying={currentlyPlaying}
                playRecording={playRecording}
                formatTime={formatTime}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
