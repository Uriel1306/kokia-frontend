import { useCallback, type Dispatch, type MutableRefObject, type MouseEvent, type SetStateAction } from 'react';
import { apiService } from '../services/apiService';
import { getStreamUrl } from '../utils/audioUtils';
import { Recording, Timeline, TimelineItem } from '../types';

interface UseTimelineMergeOptions {
  timelines: Timeline[];
  recordings: Recording[];
  mergedTimeline: TimelineItem[];
  setTimelines: Dispatch<SetStateAction<Timeline[]>>;
  setMergedTimeline: Dispatch<SetStateAction<TimelineItem[]>>;
  setMergingStatus: Dispatch<SetStateAction<'idle' | 'merging' | 'preview' | 'done'>>;
  setShowConflictModal: Dispatch<SetStateAction<boolean>>;
  setShowNamingModal: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setPreviewCurrentTime: Dispatch<SetStateAction<number>>;
  setPreviewIndex: Dispatch<SetStateAction<number>>;
  setIsPreviewPlaying: Dispatch<SetStateAction<boolean>>;
  isPreviewPlayingRef: MutableRefObject<boolean>;
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  scenarioName: string;
}

export const useTimelineMerge = ({
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
}: UseTimelineMergeOptions) => {
  const mergeTimelines = useCallback(
    async (autoFix: boolean = false) => {
      const activeTimelines = timelines.filter(tl => tl.items.length > 0);

      if (!autoFix && activeTimelines.length > 1) {
        setShowConflictModal(true);
        return;
      }

      setShowConflictModal(false);
      setMergingStatus('merging');

      interface AbsoluteItem extends TimelineItem {
        absStart: number;
        absEnd: number;
        timelineId: string;
        timelineName: string;
        frequency: string;
        isPriority: boolean;
      }

      let timelineData: { [id: string]: AbsoluteItem[] } = {};

      activeTimelines.forEach(tl => {
        let currentOffset = 0;
        const isPriority = tl.name.includes('גדודי');
        const items: AbsoluteItem[] = [];

        tl.items.forEach(item => {
          items.push({
            ...item,
            absStart: currentOffset,
            absEnd: currentOffset + item.duration,
            timelineId: tl.id,
            timelineName: tl.name,
            frequency: tl.frequency,
            isPriority,
          });
          currentOffset += item.duration;
        });

        timelineData[tl.id] = items;
      });

      const priorityTlId = activeTimelines.find(tl => tl.name.includes('גדודי'))?.id;
      const priorityItems = priorityTlId ? timelineData[priorityTlId] : [];
      const priorityRecordings = priorityItems.filter(i => i.type === 'recording');

      Object.keys(timelineData).forEach(tlId => {
        if (tlId === priorityTlId) return;

        let items = timelineData[tlId];

        for (let i = 0; i < items.length; i++) {
          if (items[i].type !== 'recording') continue;

          const overlap = priorityRecordings.find(pr =>
            items[i].absStart < pr.absEnd && items[i].absEnd > pr.absStart
          );

          if (overlap) {
            const shift = overlap.absEnd - items[i].absStart;
            for (let j = i; j < items.length; j++) {
              items[j].absStart += shift;
              items[j].absEnd += shift;
            }
          }
        }
      });

      let allRecordings: AbsoluteItem[] = [];
      Object.values(timelineData).forEach(items => {
        allRecordings.push(...items.filter(i => i.type === 'recording'));
      });

      allRecordings.sort((a, b) => {
        if (a.absStart !== b.absStart) return a.absStart - b.absStart;
        return (a.isPriority ? 0 : 1) - (b.isPriority ? 0 : 1);
      });

      let finalRecordings: AbsoluteItem[] = [];
      let lastEnd = 0;

      allRecordings.forEach(rec => {
        if (rec.absStart < lastEnd) {
          const shift = lastEnd - rec.absStart;
          rec.absStart += shift;
          rec.absEnd += shift;
        }
        finalRecordings.push(rec);
        lastEnd = rec.absEnd;
      });

      let finalSequence: TimelineItem[] = [];
      let currentTime = 0;

      finalRecordings.forEach(rec => {
        if (rec.absStart > currentTime) {
          finalSequence.push({
            id: crypto.randomUUID(),
            type: 'delay',
            duration: rec.absStart - currentTime,
          });
        }

        finalSequence.push({
          id: rec.id,
          type: 'recording',
          recordingId: rec.recordingId,
          name: rec.name,
          duration: rec.duration,
          timelineName: rec.timelineName,
          frequency: rec.frequency,
        });

        currentTime = rec.absEnd;
      });

      setMergedTimeline(finalSequence);
      setMergingStatus('preview');
    },
    [audioRef, isPreviewPlayingRef, recordings, setMergingStatus, setMergedTimeline, setShowConflictModal, timelines]
  );

  const finalizeMerge = useCallback(() => {
    setShowNamingModal(true);
  }, [setShowNamingModal]);

  const confirmFinalizeMerge = useCallback(async () => {
    setShowNamingModal(false);
    setMergingStatus('merging');

    try {
      const savedTimeline = await apiService.saveTimeline(scenarioName, mergedTimeline);
      setTimelines(prev => [savedTimeline as Timeline, ...prev]);
      setMergedTimeline([]);
      setPreviewIndex(-1);
      setIsPreviewPlaying(false);
      setPreviewCurrentTime(0);
      setMergingStatus('idle');
    } catch (err) {
      console.error(err);
      setError('שגיאה בשמירת התרחיש לשרת. אנא נסה שוב.');
      setMergingStatus('idle');
    }
  }, [mergedTimeline, scenarioName, setError, setIsPreviewPlaying, setMergedTimeline, setMergingStatus, setPreviewCurrentTime, setPreviewIndex, setTimelines]);

  const playPreview = useCallback(
    async (startTime: number = 0) => {
      if (isPreviewPlayingRef.current && startTime === 0) {
        setIsPreviewPlaying(false);
        isPreviewPlayingRef.current = false;
        audioRef.current?.pause();
        return;
      }

      isPreviewPlayingRef.current = false;
      audioRef.current?.pause();
      await new Promise(resolve => setTimeout(resolve, 50));

      setIsPreviewPlaying(true);
      isPreviewPlayingRef.current = true;
      setPreviewCurrentTime(startTime);

      let accumulatedTime = 0;
      let preloadAudio: HTMLAudioElement | null = null;

      const playItem = async (item: TimelineItem, offset: number): Promise<void> => {
        if (!isPreviewPlayingRef.current) return;

        if (item.type === 'recording') {
          const recording = (recordings || []).find(r => r.id === item.recordingId);
          if (recording) {
            const streamUrl = `http://localhost:3001/api/recordings/${recording.id}/stream`;
            console.log('[Timeline Preview] Playing audio:', streamUrl);
            const audio = new Audio(streamUrl);
            audio.crossOrigin = 'anonymous';
            audio.addEventListener('error', (e) => {
              console.error('[Timeline Preview] Audio error:', e, 'URL:', streamUrl);
            });
            audioRef.current = audio;
            audio.currentTime = offset;

            // Preload next item if exists
            const nextIndex = mergedTimeline.indexOf(item) + 1;
            if (nextIndex < mergedTimeline.length && mergedTimeline[nextIndex].type === 'recording') {
              const nextRecording = recordings.find(r => r.id === mergedTimeline[nextIndex].recordingId);
              if (nextRecording) {
                preloadAudio = new Audio(`http://localhost:3001/api/recordings/${nextRecording.id}/stream`);
                preloadAudio.crossOrigin = 'anonymous';
                preloadAudio.preload = 'auto';
              }
            }

            return new Promise((resolve) => {
              const updateTime = () => {
                if (isPreviewPlayingRef.current) {
                  setPreviewCurrentTime(accumulatedTime + audio.currentTime);
                }
              };

              audio.addEventListener('timeupdate', updateTime);
              audio.play();
              audio.onended = () => {
                audio.removeEventListener('timeupdate', updateTime);
                resolve();
              };
            });
          }
        } else {
          // Delay item
          const remainingDuration = item.duration - offset;
          return new Promise((resolve) => {
            const startDelayTime = Date.now();
            const delayInterval = setInterval(() => {
              if (isPreviewPlayingRef.current) {
                const elapsed = (Date.now() - startDelayTime) / 1000;
                setPreviewCurrentTime(accumulatedTime + offset + elapsed);
              } else {
                clearInterval(delayInterval);
              }
            }, 100);

            const timeout = setTimeout(() => {
              clearInterval(delayInterval);
              resolve();
            }, remainingDuration * 1000);

            const checkStop = setInterval(() => {
              if (!isPreviewPlayingRef.current) {
                clearTimeout(timeout);
                clearInterval(delayInterval);
                clearInterval(checkStop);
                resolve();
              }
            }, 50);
          });
        }
      };

      for (let i = 0; i < mergedTimeline.length; i++) {
        if (!isPreviewPlayingRef.current) break;

        const item = mergedTimeline[i];
        const itemEndTime = accumulatedTime + item.duration;

        if (itemEndTime <= startTime) {
          accumulatedTime = itemEndTime;
          continue;
        }

        setPreviewIndex(i);
        const offset = Math.max(0, startTime - accumulatedTime);

        await playItem(item, offset);

        accumulatedTime = itemEndTime;
        startTime = accumulatedTime;
      }

      if (isPreviewPlayingRef.current) {
        setIsPreviewPlaying(false);
        isPreviewPlayingRef.current = false;
        setPreviewIndex(-1);
        setPreviewCurrentTime(0);
      }
    },
    [audioRef, isPreviewPlayingRef, mergedTimeline, recordings, setIsPreviewPlaying, setPreviewCurrentTime, setPreviewIndex]
  );

  const handleProgressBarClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percentage * mergedTimeline.reduce((acc, item) => acc + item.duration, 0);
      setPreviewCurrentTime(newTime);
      playPreview(newTime);
    },
    [mergedTimeline, playPreview, setPreviewCurrentTime]
  );

  return {
    mergeTimelines,
    finalizeMerge,
    confirmFinalizeMerge,
    playPreview,
    handleProgressBarClick,
  };
};
