import { useState, useEffect, useRef, useMemo } from 'react';
import { Recording } from '../types';
import { apiService } from '../services/apiService';
import { formatTime } from '../utils/audioUtils';
import ArchiveSection from '../components/ArchiveSection';

export default function ArchivePage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [archiveSearchQueries, setArchiveSearchQueries] = useState<{ [key: string]: string }>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPreviewPlayingRef = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedRecordings = await apiService.getRecordings();
        setRecordings(loadedRecordings.map(rec => ({
          ...rec,
          url: rec.streamUrl ?? `http://localhost:3001/api/recordings/${rec.id}/stream`,
        })));
      } catch (err) {
        console.error(err);
      }
    };

    loadData();
  }, []);

  const playRecording = async (recording: Recording) => {
    if (currentlyPlaying === recording.id) {
      audioRef.current?.pause();
      setCurrentlyPlaying(null);
      setIsLoadingAudio(false);
      isPreviewPlayingRef.current = false;
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setCurrentlyPlaying(recording.id);
    setIsLoadingAudio(true);

    if (recording.sequence && recording.sequence.length > 0) {
      // Handle sequence playback
      for (let i = 0; i < recording.sequence.length; i++) {
        const item = recording.sequence[i];
        if (item.type === 'recording') {
          const subRec = (recordings || []).find(r => r.id === item.recordingId);
          if (subRec) {
            const streamUrl = `http://localhost:3001/api/recordings/${subRec.id}/stream`;
            console.log('[Archive Sequence] Playing:', streamUrl);
            await new Promise<void>((resolve) => {
              const audio = new Audio(streamUrl);
              audio.crossOrigin = 'anonymous';
              audio.addEventListener('error', (e) => {
                console.error('[Archive Sequence] Error:', e, 'URL:', streamUrl);
                resolve();
              });
              audioRef.current = audio;
              audio.play();
              audio.onended = () => resolve();
            });
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, item.duration * 1000));
        }

        if (currentlyPlaying !== recording.id) break;
      }

      if (currentlyPlaying === recording.id) {
        setCurrentlyPlaying(null);
        setIsLoadingAudio(false);
      }
    } else {
      const streamUrl = `http://localhost:3001/api/recordings/${recording.id}/stream`;
      console.log('[Archive Playback] Playing single recording:', streamUrl);
      const audio = new Audio(streamUrl);
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;

      audio.addEventListener('canplaythrough', () => {
        console.log('[Archive Playback] Audio ready:', streamUrl);
        setIsLoadingAudio(false);
      });

      audio.addEventListener('error', (e) => {
        console.error('[Archive Playback] Error loading audio:', e, 'URL:', streamUrl);
        setIsLoadingAudio(false);
      });

      audio.play();
      audio.onended = () => {
        setCurrentlyPlaying(null);
        setIsLoadingAudio(false);
      };
    }
  };

  const scenarios = useMemo(() => recordings.filter(r => r.sequence), [recordings]);
  const regularRecordings = useMemo(() => recordings.filter(r => !r.sequence), [recordings]);

  const groupedRecordings = useMemo(() => regularRecordings.reduce((acc, rec) => {
    const freq = 'כל ההקלטות';
    if (!acc[freq]) acc[freq] = [];
    acc[freq].push(rec);
    return acc;
  }, {} as { [key: string]: Recording[] }), [regularRecordings]);

  const toggleGroup = (freq: string) => {
    setExpandedGroups(prev => (prev.includes(freq) ? prev.filter(f => f !== freq) : [...prev, freq]));
  };

  return (
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
  );
}