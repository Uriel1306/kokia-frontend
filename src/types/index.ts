export interface TimelineItem {
  id: string;
  type: 'recording' | 'delay';
  recordingId?: string;
  name?: string;
  duration: number;
  timelineName?: string;
  frequency?: string;
}

export interface Recording {
  id: string;
  title: string;
  url: string;
  streamUrl?: string;
  duration: number;
  createdAt: number;
  sequence?: TimelineItem[];
}

export interface Timeline {
  id: string;
  name: string;
  frequency: string;
  items: TimelineItem[];
  searchQuery?: string;
  sortMethod?: 'newest' | 'oldest' | 'alphabetical' | 'numerical';
  selectedRecordingId?: string;
}

export type Tab = 'recordings' | 'scenarios' | 'archive';
