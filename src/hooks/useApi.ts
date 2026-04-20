import { useState, useCallback } from "react";
import { apiService, APIError } from "../services/apiService";
import type { Recording, Timeline, TimelineItem, SystemStatus } from "../types";

// ============================================================================
// useApi Hook - React Hook for API interactions with state management
// ============================================================================

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: APIError | null;
}

export const useApi = () => {
  // =========================================================================
  // RECORDINGS
  // =========================================================================

  const [recordingsState, setRecordingsState] = useState<
    UseApiState<Recording[]>
  >({
    data: null,
    loading: false,
    error: null,
  });

  const fetchRecordings = useCallback(async () => {
    setRecordingsState({ data: null, loading: true, error: null });
    try {
      const data = await apiService.getRecordings();
      setRecordingsState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const apiError =
        error instanceof APIError ? error : new APIError(500, "Unknown error");
      setRecordingsState({ data: null, loading: false, error: apiError });
      throw apiError;
    }
  }, []);

  const fetchRecording = useCallback(async (id: string) => {
    setRecordingsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiService.getRecording(id);
      setRecordingsState({ data: [data], loading: false, error: null });
      return data;
    } catch (error) {
      const apiError =
        error instanceof APIError ? error : new APIError(500, "Unknown error");
      setRecordingsState((prev) => ({
        ...prev,
        loading: false,
        error: apiError,
      }));
      throw apiError;
    }
  }, []);

  const uploadRecording = useCallback(
    async (file: Blob, title: string, duration: number) => {
      setRecordingsState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        console.log("duration");

        console.log(duration);
        const data = await apiService.uploadRecording(file, title, duration);
        setRecordingsState((prev) => ({
          data: prev.data ? [...prev.data, data] : [data],
          loading: false,
          error: null,
        }));
        return data;
      } catch (error) {
        const apiError =
          error instanceof APIError
            ? error
            : new APIError(500, "Unknown error");
        setRecordingsState((prev) => ({
          ...prev,
          loading: false,
          error: apiError,
        }));
        throw apiError;
      }
    },
    [],
  );

  const deleteRecording = useCallback(async (id: string) => {
    setRecordingsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await apiService.deleteRecording(id);
      setRecordingsState((prev) => ({
        data: prev.data ? prev.data.filter((r) => r.id !== id) : null,
        loading: false,
        error: null,
      }));
    } catch (error) {
      const apiError =
        error instanceof APIError ? error : new APIError(500, "Unknown error");
      setRecordingsState((prev) => ({
        ...prev,
        loading: false,
        error: apiError,
      }));
      throw apiError;
    }
  }, []);

  const getStreamUrl = useCallback((recordingId: string) => {
    return apiService.getStreamUrl(recordingId);
  }, []);

  // =========================================================================
  // TIMELINES
  // =========================================================================

  const [timelinesState, setTimelinesState] = useState<UseApiState<Timeline[]>>(
    {
      data: null,
      loading: false,
      error: null,
    },
  );

  const fetchTimelines = useCallback(async () => {
    setTimelinesState({ data: null, loading: true, error: null });
    try {
      const data = await apiService.getTimelines();
      setTimelinesState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const apiError =
        error instanceof APIError ? error : new APIError(500, "Unknown error");
      setTimelinesState({ data: null, loading: false, error: apiError });
      throw apiError;
    }
  }, []);

  const createTimeline = useCallback(
    async (title: string, frequency: number, sequence: TimelineItem[]) => {
      setTimelinesState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data = await apiService.createTimeline(
          title,
          frequency,
          sequence,
        );
        setTimelinesState((prev) => ({
          data: prev.data ? [...prev.data, data] : [data],
          loading: false,
          error: null,
        }));
        return data;
      } catch (error) {
        const apiError =
          error instanceof APIError
            ? error
            : new APIError(500, "Unknown error");
        setTimelinesState((prev) => ({
          ...prev,
          loading: false,
          error: apiError,
        }));
        throw apiError;
      }
    },
    [],
  );

  const deleteTimeline = useCallback(async (id: string) => {
    setTimelinesState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await apiService.deleteTimeline(id);
      setTimelinesState((prev) => ({
        data: prev.data ? prev.data.filter((t) => t.id !== id) : null,
        loading: false,
        error: null,
      }));
    } catch (error) {
      const apiError =
        error instanceof APIError ? error : new APIError(500, "Unknown error");
      setTimelinesState((prev) => ({
        ...prev,
        loading: false,
        error: apiError,
      }));
      throw apiError;
    }
  }, []);

  // =========================================================================
  // SYSTEM
  // =========================================================================

  const [statusState, setStatusState] = useState<UseApiState<SystemStatus>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchStatus = useCallback(async () => {
    setStatusState({ data: null, loading: true, error: null });
    try {
      const data = await apiService.getStatus();
      setStatusState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const apiError =
        error instanceof APIError ? error : new APIError(500, "Unknown error");
      setStatusState({ data: null, loading: false, error: apiError });
      throw apiError;
    }
  }, []);

  // =========================================================================
  // Return API interface
  // =========================================================================

  return {
    // Recording operations
    recordings: recordingsState,
    fetchRecordings,
    fetchRecording,
    uploadRecording,
    deleteRecording,
    getStreamUrl,

    // Timeline operations
    timelines: timelinesState,
    fetchTimelines,
    createTimeline,
    deleteTimeline,

    // System operations
    status: statusState,
    fetchStatus,
  };
};

// ============================================================================
// Export type for better TypeScript support
// ============================================================================

export type UseApiReturn = ReturnType<typeof useApi>;
