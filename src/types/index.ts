// ============================================================================
// Frontend Type Definitions - API Contract + UI helpers
// ============================================================================

export interface Recording {
  id: string;
  title: string;
  duration: number;
  createdAt: string;
  streamUrl: string;

  // Legacy / UI compatible fields
  name?: string;
  url?: string;
  sequence?: TimelineItem[];
}

export type TimelineItem =
  | {
      type: "audio";
      id: string;
      frequency: number;
      recordingId?: string;
      name?: string;
      OriginalTimeline: string;
      duration?: number;
      timelineName?: string;
    }
  | {
      type: "delay";
      seconds: number;
      id?: string;
      OriginalTimeline: string;
      duration?: number;
      name?: string;
    };

export interface Timeline {
  id: string;
  title: string;
  sequence: TimelineItem[];
  createdAt: string;
  frequency: number;

  // UI-only fields for local state and legacy compatibility
  name?: string;
  items?: TimelineItem[];
  searchQuery?: string;
  sortMethod?: "newest" | "oldest" | "alphabetical" | "numerical";
  selectedRecordingId?: string;
}

export interface SystemStatus {
  online: boolean;
  piConnected: boolean;
  diskSpace: string;
  uptime: string;
}

export type Tab = "recordings" | "scenarios" | "archive";
