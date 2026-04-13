import { useState, useRef, type Dispatch, type SetStateAction } from 'react';
import { apiService } from '../services/api';
import { Recording } from '../types';

interface UseAudioRecorderOptions {
  recordingName: string;
  recordingsCount: number;
  setRecordings: Dispatch<SetStateAction<Recording[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

export const useAudioRecorder = ({
  recordingName,
  recordingsCount,
  setRecordings,
  setError,
}: UseAudioRecorderOptions) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationRef = useRef<number>(0);

  const startRecording = async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      durationRef.current = 0;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const finalDuration = durationRef.current;

        try {
          const uploaded = await apiService.uploadRecording(
            audioBlob,
            recordingName || `הקלטה ${recordingsCount + 1}`
          );

          const newRecording: Recording = {
            ...uploaded,
            name: uploaded.name ?? (recordingName || `הקלטה ${recordingsCount + 1}`),
            duration: uploaded.duration ?? finalDuration,
            timestamp: uploaded.timestamp ?? Date.now(),
            url: uploaded.streamUrl ?? `http://localhost:3000/api/recordings/${uploaded.id}/stream`,
          };

          setRecordings(prev => [newRecording, ...prev]);
          setRecordingTime(0);
        } catch (err) {
          console.error(err);
          setError('שגיאה בהעלאת ההקלטה לשרת. אנא נסה שוב.');
        } finally {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const next = prev + 1;
          durationRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('לא ניתן לגשת למיקרופון. אנא וודא שנתת הרשאות מתאימות.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  return {
    audioRef,
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
  };
};
