import { API_BASE_URL } from "../config";
import type { Recording, Timeline, TimelineItem, SystemStatus } from "../types";

// ============================================================================
// Error Handling
// ============================================================================

export class APIError extends Error {
  constructor(
    public status: number,
    public message: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "APIError";
  }
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const body = await response.text();
    const errorMessage =
      body || `API Error: ${response.status} ${response.statusText}`;
    throw new APIError(response.status, errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
};

// ============================================================================
// API Service - Fetch-based Client
// ============================================================================

export const apiService = {
  // =========================================================================
  // RECORDINGS
  // =========================================================================

  /**
   * Get all recordings
   * GET /recordings -> Recording[]
   */
  async getRecordings(): Promise<Recording[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/recordings`);
      return handleResponse<Recording[]>(response);
    } catch (error) {
      console.error("[API] getRecordings error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(500, "Failed to fetch recordings", error);
    }
  },

  /**
   * Get a single recording by ID
   * GET /recordings/:id -> Recording
   */
  async getRecording(id: string): Promise<Recording> {
    try {
      const response = await fetch(`${API_BASE_URL}/recordings/${id}`);
      return handleResponse<Recording>(response);
    } catch (error) {
      console.error("[API] getRecording error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(500, `Failed to fetch recording ${id}`, error);
    }
  },

  /**
   * Upload a new recording
   * POST /recordings <- FormData (file: WAV, title: string)
   * Returns: Recording
   */
  async uploadRecording(
    file: Blob,
    title: string,
    duration: number,
  ): Promise<Recording> {
    if (!duration || isNaN(duration) || duration <= 0) {
      throw new APIError(400, "Invalid recording duration");
    }

    try {
      const formData = new FormData();
      formData.append("file", file, "recording.wav");
      formData.append("title", title);
      formData.append("duration", duration.toString());
      console.log(duration);

      const response = await fetch(`${API_BASE_URL}/recordings`, {
        method: "POST",
        body: formData,
        // Note: Do NOT set Content-Type header; browser will set it with boundary
      });

      return handleResponse<Recording>(response);
    } catch (error) {
      console.error("[API] uploadRecording error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(500, "Failed to upload recording", error);
    }
  },

  /**
   * Get streaming URL for audio playback
   * This generates the internal path for the <audio> tag
   * GET /recordings/:id/stream -> Blob (audio/wav)
   */
  getStreamUrl(recordingId: string): string {
    return `${API_BASE_URL}/recordings/${recordingId}/stream`;
  },

  /**
   * Delete a recording
   * DELETE /recordings/:id -> 204 No Content
   */
  async deleteRecording(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/recordings/${id}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        const body = await response.text();
        throw new APIError(
          response.status,
          body || `Failed to delete recording ${id}`,
        );
      }
    } catch (error) {
      console.error("[API] deleteRecording error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(500, `Failed to delete recording ${id}`, error);
    }
  },

  // =========================================================================
  // TIMELINES
  // =========================================================================

  /**
   * Get all timelines
   * GET /timelines -> Timeline[]
   */
  async getTimelines(): Promise<Timeline[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/timelines`);
      return handleResponse<Timeline[]>(response);
    } catch (error) {
      console.error("[API] getTimelines error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(500, "Failed to fetch timelines", error);
    }
  },

  /**
   * Create a new timeline
   * POST /timelines <- { title: string, frequency: number, sequence: TimelineItem[] }
   * Returns: Timeline
   */
  async createTimeline(
    title: string,
    frequency: number,
    sequence: TimelineItem[],
  ): Promise<Timeline> {
    try {
      const cleanSequence = sequence.map((item) => {
        if (item.type === "audio") {
          return {
            type: "audio" as const,
            id: item.id,
            recordingId: item.recordingId,
            frequency: item.frequency,
            name: item.name,
            duration: item.duration,
            timelineName: item.timelineName,
          };
        }

        return {
          type: "delay" as const,
          id: item.id,
          seconds: item.seconds,
          duration: item.duration,
          name: item.name,
        };
      });

      const response = await fetch(`${API_BASE_URL}/timelines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, frequency, sequence: cleanSequence }),
      });

      return handleResponse<Timeline>(response);
    } catch (error) {
      console.error("[API] createTimeline error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(500, "Failed to create timeline", error);
    }
  },

  /**
   * Delete a timeline
   * DELETE /timelines/:id -> 204 No Content
   */
  async deleteTimeline(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/timelines/${id}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        const body = await response.text();
        throw new APIError(
          response.status,
          body || `Failed to delete timeline ${id}`,
        );
      }
    } catch (error) {
      console.error("[API] deleteTimeline error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(500, `Failed to delete timeline ${id}`, error);
    }
  },

  // =========================================================================
  // SYSTEM
  // =========================================================================

  /**
   * Get system status
   * GET /status -> SystemStatus
   */
  async getStatus(): Promise<SystemStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}/status`);
      return handleResponse<SystemStatus>(response);
    } catch (error) {
      console.error("[API] getStatus error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(500, "Failed to fetch system status", error);
    }
  },
};
