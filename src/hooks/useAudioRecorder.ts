import { useState, useRef, type Dispatch, type SetStateAction } from 'react';
import { apiService } from '../services/apiService';
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

  const ensureMicPermission = async (): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('Microphone permission error:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('הגישה למיקרופון חסומה. לחץ על סמל המנעול ליד שורת הכתובת בדפדפן ואפשר את המיקרופון.');
      } else {
        setError('לא ניתן לגשת למיקרופון. אנא וודא שנתת הרשאות מתאימות.');
      }
      throw err;
    }
  };

  const getAudioDurationFromBlob = (blob: Blob): Promise<number> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = 'metadata';

      const cleanup = () => {
        URL.revokeObjectURL(url);
      };

      audio.addEventListener('loadedmetadata', () => {
        cleanup();
        const duration = audio.duration;
        if (!duration || isNaN(duration) || duration <= 0) {
          reject(new Error('Invalid audio duration'));
        } else {
          resolve(duration);
        }
      });

      audio.addEventListener('error', () => {
        cleanup();
        reject(new Error('Unable to read audio duration'));
      });
    });
  };

  const startRecording = async () => {
    setError(null);

    try {
      const stream = await ensureMicPermission();
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
        let finalDuration = durationRef.current;

        try {
          finalDuration = Math.round(await getAudioDurationFromBlob(audioBlob));
        } catch (durationError) {
          console.error('Duration extraction failed:', durationError);
          setError('לא ניתן לחשב את משך ההקלטה. אנא נסה שוב.');
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        if (!finalDuration || isNaN(finalDuration) || finalDuration <= 0) {
          setError('משך ההקלטה אינו תקין. אנא נסה שוב.');
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        try {
          const uploaded = await apiService.uploadRecording(
            audioBlob,
            recordingName || `הקלטה ${recordingsCount + 1}`,
            finalDuration
          );

          const newRecording: Recording = {
            ...uploaded,
            title: uploaded.title ?? (recordingName || `הקלטה ${recordingsCount + 1}`),
            name: uploaded.title ?? (recordingName || `הקלטה ${recordingsCount + 1}`),
            duration: uploaded.duration ?? finalDuration,
            createdAt: uploaded.createdAt ?? new Date().toISOString(),
            url: apiService.getStreamUrl(uploaded.id),
          };

          console.log('[Recording] New recording URL:', newRecording.url);
          setRecordings(prev => [newRecording, ...(prev || [])]);
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
      // Error already handled in ensureMicPermission
      console.error('Recording start failed:', err);
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
