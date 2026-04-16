import { useState, useEffect, useRef, useMemo } from "react";
import { Recording, Timeline } from "../types";
import { apiService } from "../services/apiService";
import { formatTime } from "../utils/audioUtils";
import ArchiveSection from "../components/ArchiveSection";

export default function ArchivePage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [archiveSearchQueries, setArchiveSearchQueries] = useState<{ [key: string]: string }>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<string | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedRecordings, loadedTimelines] = await Promise.all([
          apiService.getRecordings(),
          apiService.getTimelines(),
        ]);

        setRecordings(
          loadedRecordings.map((rec) => ({
            ...rec,
            name: rec.title,
            url: apiService.getStreamUrl(rec.id),
          })),
        );

        setTimelines(
          loadedTimelines.map((timeline) => ({
            ...timeline,
            name: timeline.title,
            searchQuery: "",
            sortMethod: "newest",
            selectedRecordingId: "",
          })),
        );
      } catch (err) {
        console.error(err);
      }
    };

    loadData();
  }, []);

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    isPlayingRef.current = null;
    setCurrentlyPlaying(null);
    setIsLoadingAudio(false);
    setCurrentPlaybackTime(0);
  };

  const playRecording = async (recording: Recording) => {
    if (currentlyPlaying === recording.id) {
      stopPlayback();
      return;
    }

    stopPlayback();
    setCurrentlyPlaying(recording.id);
    isPlayingRef.current = recording.id;
    setIsLoadingAudio(true);

    const streamUrl = apiService.getStreamUrl(recording.id);
    const audio = new Audio(streamUrl);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => {
      if (isPlayingRef.current === recording.id) {
        setCurrentPlaybackTime(audio.currentTime);
      }
    });

    audio.addEventListener("canplaythrough", () => setIsLoadingAudio(false));
    audio.addEventListener("error", () => {
      setIsLoadingAudio(false);
      stopPlayback();
    });

    audio.play();
    audio.onended = () => stopPlayback();
  };

  const playTimeline = async (timeline: Timeline) => {
    if (currentlyPlaying === timeline.id) {
      stopPlayback();
      return;
    }

    stopPlayback();
    setCurrentlyPlaying(timeline.id);
    isPlayingRef.current = timeline.id;
    setIsLoadingAudio(true);

    try {
      let accumulatedTime = 0;

      for (const item of timeline.sequence) {
        if (isPlayingRef.current !== timeline.id) break;

        if (item.type === "audio") {
          const recording = recordings.find((r) => r.id === item.recordingId);
          if (!recording) continue;

          await new Promise<void>((resolve) => {
            if (isPlayingRef.current !== timeline.id) return resolve();

            const streamUrl = apiService.getStreamUrl(recording.id);
            const audio = new Audio(streamUrl);
            audio.crossOrigin = "anonymous";
            audioRef.current = audio;

            audio.onplay = () => setIsLoadingAudio(false);

            audio.addEventListener("timeupdate", () => {
              if (isPlayingRef.current === timeline.id) {
                setCurrentPlaybackTime(accumulatedTime + audio.currentTime);
              }
            });

            audio.onended = () => {
              accumulatedTime += (recording.duration || 0);
              resolve();
            };

            audio.addEventListener("error", () => resolve());
            audio.play().catch(() => resolve());
          });
        } else {
          await new Promise<void>((resolve) => {
            const delayStart = Date.now();
            const timer = setInterval(() => {
              if (isPlayingRef.current !== timeline.id) {
                clearInterval(timer);
                return resolve();
              }
              
              const diffSeconds = (Date.now() - delayStart) / 1000;
              if (diffSeconds >= item.seconds) {
                clearInterval(timer);
                accumulatedTime += item.seconds;
                resolve();
              } else {
                setCurrentPlaybackTime(accumulatedTime + diffSeconds);
              }
            }, 50);
          });
        }
      }
    } finally {
      if (isPlayingRef.current === timeline.id) {
        stopPlayback();
      }
    }
  };

  const savedTimelines = useMemo(() => timelines, [timelines]);
  const regularRecordings = useMemo(
    () => recordings.filter((r) => !r.sequence),
    [recordings],
  );

  const groupedRecordings = useMemo(
    () =>
      regularRecordings.reduce(
        (acc, rec) => {
          const freq = "כל ההקלטות";
          if (!acc[freq]) acc[freq] = [];
          acc[freq].push(rec);
          return acc;
        },
        {} as { [key: string]: Recording[] },
      ),
    [regularRecordings],
  );

  const toggleGroup = (freq: string) => {
    setExpandedGroups((prev) =>
      prev.includes(freq) ? prev.filter((f) => f !== freq) : [...prev, freq],
    );
  };

  const updateTimelineSearch = (
    updates: Partial<Pick<Timeline, "searchQuery" | "sortMethod">>,
  ) => {
    setTimelines((prev) =>
      prev.map((timeline) => ({ ...timeline, ...updates })),
    );
  };

  return (
    <ArchiveSection
      recordings={recordings} // <--- הוספנו את זה כאן!
      timelines={savedTimelines}
      groupedRecordings={groupedRecordings}
      expandedGroups={expandedGroups}
      toggleGroup={toggleGroup}
      archiveSearchQueries={archiveSearchQueries}
      setArchiveSearchQueries={setArchiveSearchQueries}
      updateTimelineSearch={updateTimelineSearch}
      currentlyPlaying={currentlyPlaying}
      playRecording={playRecording}
      playTimeline={playTimeline}
      formatTime={formatTime}
      currentPlaybackTime={currentPlaybackTime}
    />
  );
}