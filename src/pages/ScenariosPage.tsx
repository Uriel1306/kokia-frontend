import { useState, useEffect, useRef, useMemo } from "react";
import { Recording, Timeline, TimelineItem } from "../types";
import { apiService } from "../services/apiService";
import { useTimelineMerge } from "../hooks/useTimelineMerge";
import {
  getParsedFrequency,
  validateFrequency,
  formatFrequencyForDisplay,
  formatTime,
} from "../utils/audioUtils";
import TimelineSection from "../components/TimelineSection";

export default function ScenariosPage() {
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [newTimelineName, setNewTimelineName] = useState("");
  const [newTimelineFrequency, setNewTimelineFrequency] = useState("");
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [mergingStatus, setMergingStatus] = useState<
    "idle" | "merging" | "preview" | "done"
  >("idle");
  const [mergedTimeline, setMergedTimeline] = useState<TimelineItem[]>([]);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(-1);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewTotalDuration, setPreviewTotalDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPreviewPlayingRef = useRef(false);

  useEffect(() => {
    let total = 0;
    for (const item of mergedTimeline) {
      if (item.type === "delay") {
        total += item.seconds;
      } else if (item.type === "audio") {
        const rec = recordings.find((r) => r.id === item.recordingId);
        total += rec?.duration ?? item.duration ?? 0;
      }
    }
    setPreviewTotalDuration(total);
    setPreviewCurrentTime(0);
  }, [mergedTimeline, recordings]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedRecordings = await apiService.getRecordings();

        console.log("[Scenarios] Loaded recordings:", loadedRecordings.length);

        setRecordings(
          loadedRecordings.map((rec) => ({
            ...rec,
            name: rec.title,
            url: apiService.getStreamUrl(rec.id),
          })),
        );
      } catch (err) {
        console.error(err);
        setError("לא ניתן לטעון הקלטות מהשרת. אנא נסה מאוחר יותר.");
      }
    };

    loadData();
  }, []);

  const updateTimelineSearch = (
    timelineId: string,
    updates: Partial<
      Pick<Timeline, "searchQuery" | "sortMethod" | "selectedRecordingId">
    >,
  ) => {
    setTimelines((prev) =>
      prev.map((tl) => (tl.id === timelineId ? { ...tl, ...updates } : tl)),
    );
  };

  const addTimeline = () => {
    if (!newTimelineName.trim()) return;
    const normalizedFreq = newTimelineFrequency.replace(",", ".");
    const freqError = validateFrequency(normalizedFreq);
    if (freqError) {
      setError(freqError);
      return;
    }
    const num = getParsedFrequency(normalizedFreq);
    const freqAsNumber = Math.round(num * 1000);

    const newTimeline: Timeline = {
      id: crypto.randomUUID(),
      title: newTimelineName,
      name: newTimelineName,
      frequency: freqAsNumber,
      sequence: [],
      items: [],
      createdAt: new Date().toISOString(),
      searchQuery: "",
      sortMethod: "newest",
      selectedRecordingId: "",
    };
    setTimelines([...timelines, newTimeline]);
    setNewTimelineName("");
    setNewTimelineFrequency("");
    setError(null);
  };
  const addItemToTimeline = (timelineId: string, item: TimelineItem) => {
    setTimelines((prev) => {
      // מוצאים את התרחיש שאליו מוסיפים כדי לקחת את השם שלו
      const targetTimeline = prev.find((tl) => tl.id === timelineId);
      const timelineName = targetTimeline
        ? targetTimeline.title
        : "תרחיש לא ידוע";

      return prev.map((tl) => {
        if (tl.id === timelineId) {
          // מוודאים שהפריט שנוסף מקבל את שם התרחיש
          const itemWithOrigin = {
            ...item,
            OriginalTimeline: item.OriginalTimeline || timelineName,
          };

          const newSequence = [...tl.sequence, itemWithOrigin];
          const newItems = [...(tl.items || []), itemWithOrigin];

          if (itemWithOrigin.type === "audio") {
            const possibleDelays = [0.5, 1, 1.5, 2];
            const randomDelay =
              possibleDelays[Math.floor(Math.random() * possibleDelays.length)];

            // יצירת פריט ההשהיה עם השדה החדש
            const delayItem: TimelineItem = {
              type: "delay",
              seconds: randomDelay,
              id: crypto.randomUUID(),
              duration: randomDelay,
              name: "השהיה אקראית",
              OriginalTimeline: timelineName, // <--- הוספנו כאן!
            };

            newSequence.push(delayItem);
            newItems.push(delayItem);
          }
          return { ...tl, sequence: newSequence, items: newItems };
        }
        return tl;
      });
    });
  };

  const removeItemFromTimeline = (timelineId: string, itemId: string) => {
    setTimelines((prev) =>
      prev.map((tl) => {
        if (tl.id === timelineId) {
          const newSequence = tl.sequence.filter((item) => item.id !== itemId);
          const newItems = (tl.items || []).filter(
            (item) => item.id !== itemId,
          );
          return { ...tl, sequence: newSequence, items: newItems };
        }
        return tl;
      }),
    );
  };

  const updateDelayDuration = (
    timelineId: string,
    itemId: string,
    newDuration: number,
  ) => {
    setTimelines((prev) =>
      prev.map((tl) => {
        if (tl.id === timelineId) {
          const newSequence = tl.sequence.map((item) =>
            item.id === itemId && item.type === "delay"
              ? {
                  ...item,
                  seconds: Math.max(0.5, newDuration),
                  duration: Math.max(0.5, newDuration),
                }
              : item,
          );
          const newItems = (tl.items || []).map((item) =>
            item.id === itemId && item.type === "delay"
              ? {
                  ...item,
                  seconds: Math.max(0.5, newDuration),
                  duration: Math.max(0.5, newDuration),
                }
              : item,
          );
          return { ...tl, sequence: newSequence, items: newItems };
        }
        return tl;
      }),
    );
  };

  const reorderTimelineItems = (
    timelineId: string,
    newSequence: TimelineItem[],
  ) => {
    setTimelines((prev) =>
      prev.map((tl) =>
        tl.id === timelineId
          ? { ...tl, sequence: newSequence, items: newSequence }
          : tl,
      ),
    );
  };

  const removeTimeline = (timelineId: string) => {
    setTimelines((prev) => prev.filter((tl) => tl.id !== timelineId));
  };

  const getSortedRecordings = (
    query: string = "",
    sortMethod: string = "newest",
  ) => {
    let filtered = [...recordings];
    if (query) {
      filtered = filtered.filter((r) =>
        r.title.toLowerCase().includes(query.toLowerCase()),
      );
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
    setMergingStatus("idle");
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
      getSortedRecordings={getSortedRecordings}
      recordings={recordings}
      addItemToTimeline={addItemToTimeline}
      removeItemFromTimeline={removeItemFromTimeline}
      updateDelayDuration={updateDelayDuration}
      updateTimelineSearch={updateTimelineSearch}
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
