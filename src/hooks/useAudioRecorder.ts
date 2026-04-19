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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef<number>(0);

  const ensureMicPermission = async (): Promise<MediaStream> => {
    try {
      // בקשת הרשאה מפורשת
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return stream;
    } catch (err) {
      console.error('Microphone permission error:', err);
      const errorMessage = (err instanceof DOMException && err.name === 'NotAllowedError')
        ? 'הגישה למיקרופון חסומה. לחץ על סמל המנעול ליד שורת הכתובת ואפשר את המיקרופון.'
        : 'לא ניתן לגשת למיקרופון. וודא שהוא מחובר ושיש הרשאות מתאימות.';
      setError(errorMessage);
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
    audioChunksRef.current = []; // איפוס הבאפר
    durationRef.current = 0;

    try {
      const stream = await ensureMicPermission();
      
      // בדיקת פורמט נתמך (WebM הוא הסטנדרט בדפדפנים מודרניים)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

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
          // העלאה לבאקנד בפורט 3001
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

          setRecordings(prev => [newRecording, ...(prev || [])]);
        } catch (err) {
          console.error('Upload error:', err);
          setError('שגיאה בהעלאת ההקלטה לשרת (3001). וודא שהבאקנד רץ.');
        } finally {
          // סגירת המיקרופון בסיום
          stream.getTracks().forEach(track => track.stop());
        }
      };

      // התחלת הקלטה ב-Chunks של שנייה
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          durationRef.current = prev + 1;
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
  };
};