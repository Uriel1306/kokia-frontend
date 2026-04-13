import { useState, useRef, useEffect } from 'react';
import { Recording } from '../types';
import { apiService } from '../services/apiService';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { formatTime } from '../utils/audioUtils';
import RecordingSection from '../components/RecordingSection';

export default function RecordingsPage() {
  const [recordingName, setRecordingName] = useState('');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'name' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPreviewPlayingRef = useRef(false);

  const { isRecording, recordingTime, startRecording, stopRecording } = useAudioRecorder({
    recordingName,
    recordingsCount: recordings.length,
    setRecordings,
    setError,
  });
useEffect(() => {
  const fetchRecordings = async () => {
    try {
      const data = await apiService.getRecordings();
      setRecordings(data);
    } catch (err) {
      setError("שגיאה בטעינת ההקלטות מהשרת");
    }
  };
  fetchRecordings();
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
            console.log('[Playback Sequence] Playing:', streamUrl);
            await new Promise<void>((resolve) => {
              const audio = new Audio(streamUrl);
              audio.crossOrigin = 'anonymous';
              audio.addEventListener('error', (e) => {
                console.error('[Playback Sequence] Error:', e, 'URL:', streamUrl);
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
      console.log('[Playback] Playing single recording:', streamUrl);
      const audio = new Audio(streamUrl);
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;

      audio.addEventListener('canplaythrough', () => {
        console.log('[Playback] Audio ready:', streamUrl);
        setIsLoadingAudio(false);
      });

      audio.addEventListener('error', (e) => {
        console.error('[Playback] Error loading audio:', e, 'URL:', streamUrl);
        setIsLoadingAudio(false);
        setError('שגיאה בטעינת ההקלטה');
      });

      audio.play();
      audio.onended = () => {
        setCurrentlyPlaying(null);
        setIsLoadingAudio(false);
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
        setIsLoadingAudio(false);
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

  return (
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
  );
}