import { useState, useEffect, useRef, useMemo } from 'react';
import { Recording, Timeline, TimelineItem } from '../types';
import { apiService } from '../services/apiService';
import { useTimelineMerge } from '../hooks/useTimelineMerge';
import { getParsedFrequency, validateFrequency, formatFrequencyForDisplay, formatTime } from '../utils/audioUtils';
import TimelineSection from '../components/TimelineSection';

export default function ScenariosPage() {
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
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
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPreviewPlayingRef = useRef(false);

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

        console.log('[Scenarios] Loaded recordings:', loadedRecordings.length);
        setRecordings((loadedRecordings || []).map(rec => ({
          ...rec,
          url: rec.streamUrl ?? `http://localhost:3001/api/recordings/${rec.id}/stream`,
        })));
        setTimelines((loadedTimelines || []).map(tl => ({
          ...tl,
          items: tl.items || [],
          searchQuery: tl.searchQuery || '',
          sortMethod: tl.sortMethod || 'newest',
          selectedRecordingId: tl.selectedRecordingId || '',
        })));
      } catch (err) {
        console.error(err);
        setError('לא ניתן לטעון הקלטות או תרחישים מהשרת. אנא נסה מאוחר יותר.');
      }
    };

    loadData();
  }, []);

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
        const currentItems = tl.items || [];
        const newItems = [...currentItems, { ...item, id: crypto.randomUUID() }];
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
        return { ...tl, items: (tl.items || []).filter(i => i.id !== itemId) };
      }
      return tl;
    }));
  };

  const updateDelayDuration = (timelineId: string, itemId: string, newDuration: number) => {
    setTimelines(prev => prev.map(tl => {
      if (tl.id === timelineId) {
        return {
          ...tl,
          items: (tl.items || []).map(item => item.id === itemId ? { ...item, duration: Math.max(0.5, newDuration) } : item),
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
  );
}