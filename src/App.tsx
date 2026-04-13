/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Clock, Radio, Save, ListMusic, GripVertical, Archive, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';

interface Recording {
  id: string;
  name: string;
  url: string;
  duration: number;
  timestamp: number;
  sequence?: TimelineItem[]; // For merged recordings
}

interface TimelineItem {
  id: string;
  type: 'recording' | 'delay';
  recordingId?: string;
  name?: string;
  duration: number;
  timelineName?: string;
  frequency?: string;
}

interface Timeline {
  id: string;
  name: string;
  frequency: string;
  items: TimelineItem[];
  searchQuery?: string;
  sortMethod?: 'newest' | 'oldest' | 'alphabetical' | 'numerical';
  selectedRecordingId?: string;
}

type Tab = 'recordings' | 'scenarios' | 'archive';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('recordings');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingName, setRecordingName] = useState('');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'name' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Scenario State
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [newTimelineName, setNewTimelineName] = useState('');
  const [newTimelineFrequency, setNewTimelineFrequency] = useState('');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [mergingStatus, setMergingStatus] = useState<'idle' | 'merging' | 'preview' | 'done'>('idle');
  const [mergedTimeline, setMergedTimeline] = useState<TimelineItem[]>([]);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(-1);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewTotalDuration, setPreviewTotalDuration] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [archiveSearchQueries, setArchiveSearchQueries] = useState<{ [key: string]: string }>({});
  const isPreviewPlayingRef = useRef(false);

  useEffect(() => {
    const total = mergedTimeline.reduce((acc, item) => acc + item.duration, 0);
    setPreviewTotalDuration(total);
    setPreviewCurrentTime(0);
  }, [mergedTimeline]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationRef = useRef<number>(0);

  const getParsedFrequency = (val: string): number => {
    const normalizedVal = val.replace(',', '.');
    let num = parseFloat(normalizedVal);
    if (!normalizedVal.includes('.') && !isNaN(num) && num > 1000) {
      return num / 1000;
    }
    return num;
  };

  const formatFrequencyForDisplay = (freq: string | undefined) => {
    if (!freq) return '';
    if (freq.includes('.')) return freq;
    const n = parseInt(freq);
    if (isNaN(n)) return freq;
    return (n / 1000).toFixed(3);
  };

  const validateFrequency = (val: string) => {
    const num = getParsedFrequency(val);
    if (isNaN(num)) return "נא להזין מספר תקין";
    if (num < 33 || num > 87.975) return "התדר חייב להיות בין 33 ל-87.975 MHz";
    
    const remainder = Math.round(num * 1000) % 25;
    if (remainder !== 0) return "התדר חייב להיות בקפיצות של 25 קילו-הרץ (למשל 33.025, 33.050)";
    
    return null;
  };

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

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const finalDuration = durationRef.current;

        const newRecording: Recording = {
          id: crypto.randomUUID(),
          name: recordingName || `הקלטה ${recordings.length + 1}`,
          url: audioUrl,
          duration: finalDuration,
          timestamp: Date.now(),
        };

        setRecordings(prev => [newRecording, ...prev]);
        setRecordingTime(0);
        setRecordingName('');
        durationRef.current = 0;
        
        stream.getTracks().forEach(track => track.stop());
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

  const currentlyPlayingRef = useRef<string | null>(null);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} שניות`;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round((seconds % 60) * 10) / 10;
    
    const parts = [];
    if (hrs > 0) parts.push(`${hrs} שעות`);
    if (mins > 0) parts.push(`${mins} דקות`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} שניות`);
    
    return parts.join(', ');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playRecording = async (recording: Recording | { url: string, id: string, sequence?: TimelineItem[] }) => {
    if (currentlyPlaying === recording.id) {
      audioRef.current?.pause();
      setCurrentlyPlaying(null);
      currentlyPlayingRef.current = null;
      setIsPreviewPlaying(false);
      isPreviewPlayingRef.current = false;
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setCurrentlyPlaying(recording.id);
    currentlyPlayingRef.current = recording.id;

    if (recording.sequence && recording.sequence.length > 0) {
      setIsPreviewPlaying(true);
      isPreviewPlayingRef.current = true;
      for (let i = 0; i < recording.sequence.length; i++) {
        const item = recording.sequence[i];
        if (item.type === 'recording') {
          const subRec = recordings.find(r => r.id === item.recordingId);
          if (subRec) {
            await new Promise((resolve) => {
              const audio = new Audio(subRec.url);
              audioRef.current = audio;
              audio.play();
              audio.onended = resolve;
            });
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, item.duration * 1000));
        }
        
        if (currentlyPlayingRef.current !== recording.id) break;
      }
      
      if (currentlyPlayingRef.current === recording.id) {
        setCurrentlyPlaying(null);
        currentlyPlayingRef.current = null;
        setIsPreviewPlaying(false);
        isPreviewPlayingRef.current = false;
      }
    } else {
      const audio = new Audio(recording.url);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => {
        setCurrentlyPlaying(null);
        currentlyPlayingRef.current = null;
      };
    }
  };

  const deleteRecording = (id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
    if (currentlyPlaying === id) {
      audioRef.current?.pause();
      setCurrentlyPlaying(null);
    }
  };

  const downloadRecording = (recording: Recording | { url: string, name: string }) => {
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
        setError("שם ההקלטה לא יכול להיות ריק");
        return;
      }
      setRecordings(prev => prev.map(r => 
        r.id === id ? { ...r, name: editValue.trim() } : r
      ));
    }
    
    setError(null);
    setEditingId(null);
    setEditingField(null);
  };

  // Scenario Logic
  const addTimeline = () => {
    if (!newTimelineName.trim()) return;
    const normalizedFreq = newTimelineFrequency.replace(',', '.');
    const freqError = validateFrequency(normalizedFreq);
    if (freqError) {
      setError(freqError);
      return;
    }
    const num = getParsedFrequency(normalizedFreq);
    const digitFreq = Math.round(num * 1000).toString();
    const newTimeline: Timeline = {
      id: crypto.randomUUID(),
      name: newTimelineName,
      frequency: digitFreq,
      items: [],
      searchQuery: '',
      sortMethod: 'newest',
      selectedRecordingId: ''
    };
    setTimelines([...timelines, newTimeline]);
    setNewTimelineName('');
    setNewTimelineFrequency('');
    setError(null);
  };

  const updateTimelineSearch = (timelineId: string, updates: Partial<Pick<Timeline, 'searchQuery' | 'sortMethod' | 'selectedRecordingId'>>) => {
    setTimelines(prev => prev.map(tl => tl.id === timelineId ? { ...tl, ...updates } : tl));
  };

  const addItemToTimeline = (timelineId: string, item: Omit<TimelineItem, 'id'>) => {
    setTimelines(prev => prev.map(tl => {
      if (tl.id === timelineId) {
        const newItems = [...tl.items, { ...item, id: crypto.randomUUID() }];
        
        // Automatically add a random delay after a recording
        if (item.type === 'recording') {
          const possibleDelays = [0.5, 1, 1.5, 2];
          const randomDelay = possibleDelays[Math.floor(Math.random() * possibleDelays.length)];
          newItems.push({
            id: crypto.randomUUID(),
            type: 'delay',
            duration: randomDelay,
            name: 'השהיה אקראית'
          });
        }
        
        return {
          ...tl,
          items: newItems
        };
      }
      return tl;
    }));
  };

  const removeItemFromTimeline = (timelineId: string, itemId: string) => {
    setTimelines(prev => prev.map(tl => {
      if (tl.id === timelineId) {
        return {
          ...tl,
          items: tl.items.filter(i => i.id !== itemId)
        };
      }
      return tl;
    }));
  };

  const updateDelayDuration = (timelineId: string, itemId: string, newDuration: number) => {
    setTimelines(prev => prev.map(tl => {
      if (tl.id === timelineId) {
        return {
          ...tl,
          items: tl.items.map(item => 
            item.id === itemId ? { ...item, duration: Math.max(0.5, newDuration) } : item
          )
        };
      }
      return tl;
    }));
  };

  const reorderTimelineItems = (timelineId: string, newItems: TimelineItem[]) => {
    setTimelines(prev => prev.map(tl => 
      tl.id === timelineId ? { ...tl, items: newItems } : tl
    ));
  };

  const mergeTimelines = async (autoFix: boolean = false) => {
    const activeTimelines = timelines.filter(tl => tl.items.length > 0);
    
    if (!autoFix && activeTimelines.length > 1) {
      setShowConflictModal(true);
      return;
    }

    setShowConflictModal(false);
    setMergingStatus('merging');

    // 1. Calculate absolute intervals for each timeline
    interface AbsoluteItem extends TimelineItem {
      absStart: number;
      absEnd: number;
      timelineId: string;
      timelineName: string;
      frequency: string;
      isPriority: boolean;
    }

    let timelineData: { [id: string]: AbsoluteItem[] } = {};
    
    activeTimelines.forEach(tl => {
      let currentOffset = 0;
      const isPriority = tl.name.includes('גדודי');
      const items: AbsoluteItem[] = [];
      
      tl.items.forEach(item => {
        items.push({
          ...item,
          absStart: currentOffset,
          absEnd: currentOffset + item.duration,
          timelineId: tl.id,
          timelineName: tl.name,
          frequency: tl.frequency,
          isPriority
        });
        currentOffset += item.duration;
      });
      timelineData[tl.id] = items;
    });

    const priorityTlId = activeTimelines.find(tl => tl.name.includes('גדודי'))?.id;
    const priorityItems = priorityTlId ? timelineData[priorityTlId] : [];
    const priorityRecordings = priorityItems.filter(i => i.type === 'recording');

    // 2. Shift non-priority timelines to avoid overlaps with priority recordings
    Object.keys(timelineData).forEach(tlId => {
      if (tlId === priorityTlId) return;

      let items = timelineData[tlId];
      
      // We process recordings one by one and shift the whole remaining timeline if needed
      for (let i = 0; i < items.length; i++) {
        if (items[i].type === 'recording') {
          // Check for overlap with any priority recording
          const overlap = priorityRecordings.find(pr => 
            (items[i].absStart < pr.absEnd && items[i].absEnd > pr.absStart)
          );

          if (overlap) {
            const shift = overlap.absEnd - items[i].absStart;
            // Shift this and all subsequent items in this timeline
            for (let j = i; j < items.length; j++) {
              items[j].absStart += shift;
              items[j].absEnd += shift;
            }
          }
        }
      }
    });

    // 3. Collect all recordings and sort them
    let allRecordings: AbsoluteItem[] = [];
    Object.values(timelineData).forEach(items => {
      allRecordings.push(...items.filter(i => i.type === 'recording'));
    });

    allRecordings.sort((a, b) => {
      if (a.absStart !== b.absStart) return a.absStart - b.absStart;
      return (a.isPriority ? 0 : 1) - (b.isPriority ? 0 : 1);
    });

    // 4. Final pass to avoid any remaining overlaps between recordings
    let finalRecordings: AbsoluteItem[] = [];
    let lastEnd = 0;

    allRecordings.forEach(rec => {
      if (rec.absStart < lastEnd) {
        const shift = lastEnd - rec.absStart;
        rec.absStart += shift;
        rec.absEnd += shift;
      }
      finalRecordings.push(rec);
      lastEnd = rec.absEnd;
    });

    // 5. Build final sequence with delays
    let finalSequence: TimelineItem[] = [];
    let currentTime = 0;

    finalRecordings.forEach(rec => {
      if (rec.absStart > currentTime) {
        finalSequence.push({
          id: crypto.randomUUID(),
          type: 'delay',
          duration: rec.absStart - currentTime
        });
      }
      finalSequence.push({
        id: rec.id,
        type: 'recording',
        recordingId: rec.recordingId,
        name: rec.name,
        duration: rec.duration,
        timelineName: rec.timelineName,
        frequency: rec.frequency
      });
      currentTime = rec.absEnd;
    });

    setMergedTimeline(finalSequence);
    setMergingStatus('preview');
  };

  const getSortedRecordings = (query: string = '', sortMethod: string = 'newest') => {
    let filtered = [...recordings];
    if (query) {
      filtered = filtered.filter(r => r.name.toLowerCase().includes(query.toLowerCase()));
    }

    return filtered.sort((a, b) => {
      switch (sortMethod) {
        case 'newest':
          return b.timestamp - a.timestamp;
        case 'oldest':
          return a.timestamp - b.timestamp;
        case 'alphabetical':
          return a.name.localeCompare(b.name, 'he');
        case 'numerical':
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        default:
          return 0;
      }
    });
  };

  const finalizeMerge = () => {
    setScenarioName(`תרחיש מאוחד - ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`);
    setShowNamingModal(true);
  };

  const confirmFinalizeMerge = async () => {
    setShowNamingModal(false);
    setMergingStatus('merging');
    
    // Simulate audio processing
    setTimeout(() => {
      const totalDuration = mergedTimeline.reduce((acc, item) => acc + item.duration, 0);
      const firstRec = recordings.find(r => r.id === mergedTimeline.find(i => i.type === 'recording')?.recordingId);
      const mockUrl = firstRec?.url || recordings[0]?.url || '';

      const mergedRecording: Recording = {
        id: crypto.randomUUID(),
        name: scenarioName || `תרחיש מאוחד - ${new Date().toLocaleTimeString()}`,
        url: mockUrl,
        duration: totalDuration,
        timestamp: Date.now(),
        sequence: [...mergedTimeline] // Store the sequence for playback
      };
      
      setRecordings(prev => [mergedRecording, ...prev]);
      setMergingStatus('done');
      setMergedTimeline([]);
      setPreviewIndex(-1);
      setIsPreviewPlaying(false);
      isPreviewPlayingRef.current = false;
      setTimeout(() => setMergingStatus('idle'), 3000);
      setActiveTab('recordings');
    }, 1500);
  };

  const playPreview = async (startTime: number = 0) => {
    if (isPreviewPlaying && startTime === 0) {
      setIsPreviewPlaying(false);
      isPreviewPlayingRef.current = false;
      audioRef.current?.pause();
      return;
    }

    // Stop current playback if any
    isPreviewPlayingRef.current = false;
    audioRef.current?.pause();
    await new Promise(resolve => setTimeout(resolve, 50)); // Small buffer to ensure previous loop stops

    setIsPreviewPlaying(true);
    isPreviewPlayingRef.current = true;
    setPreviewCurrentTime(startTime);

    let accumulatedTime = 0;
    for (let i = 0; i < mergedTimeline.length; i++) {
      if (!isPreviewPlayingRef.current) break;

      const item = mergedTimeline[i];
      const itemEndTime = accumulatedTime + item.duration;

      if (itemEndTime <= startTime) {
        accumulatedTime = itemEndTime;
        continue;
      }

      setPreviewIndex(i);
      const offset = Math.max(0, startTime - accumulatedTime);
      
      if (item.type === 'recording') {
        const recording = recordings.find(r => r.id === item.recordingId);
        if (recording) {
          await new Promise((resolve) => {
            const audio = new Audio(recording.url);
            audioRef.current = audio;
            audio.currentTime = offset;
            
            const updateTime = () => {
              if (isPreviewPlayingRef.current) {
                setPreviewCurrentTime(accumulatedTime + audio.currentTime);
              }
            };
            audio.addEventListener('timeupdate', updateTime);
            
            audio.play();
            audio.onended = () => {
              audio.removeEventListener('timeupdate', updateTime);
              resolve(null);
            };
          });
        }
      } else {
        // Delay
        const remainingDuration = item.duration - offset;
        const startDelayTime = Date.now();
        
        const delayInterval = setInterval(() => {
          if (isPreviewPlayingRef.current) {
            const elapsed = (Date.now() - startDelayTime) / 1000;
            setPreviewCurrentTime(accumulatedTime + offset + elapsed);
          } else {
            clearInterval(delayInterval);
          }
        }, 100);

        await new Promise(resolve => {
          const timeout = setTimeout(() => {
            clearInterval(delayInterval);
            resolve(null);
          }, remainingDuration * 1000);
          
          // Allow stopping during delay
          const checkStop = setInterval(() => {
            if (!isPreviewPlayingRef.current) {
              clearTimeout(timeout);
              clearInterval(delayInterval);
              clearInterval(checkStop);
              resolve(null);
            }
          }, 50);
        });
      }
      
      accumulatedTime = itemEndTime;
      startTime = accumulatedTime; // Reset startTime for next items
      if (!isPreviewPlayingRef.current) break;
    }
    
    if (isPreviewPlayingRef.current) {
      setIsPreviewPlaying(false);
      isPreviewPlayingRef.current = false;
      setPreviewIndex(-1);
      setPreviewCurrentTime(0);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * previewTotalDuration;
    
    setPreviewCurrentTime(newTime);
    playPreview(newTime);
  };

  const toggleGroup = (freq: string) => {
    setExpandedGroups(prev => 
      prev.includes(freq) ? prev.filter(f => f !== freq) : [...prev, freq]
    );
  };

  const scenarios = recordings.filter(r => r.sequence);
  const regularRecordings = recordings.filter(r => !r.sequence);

  const groupedRecordings = regularRecordings.reduce((acc, rec) => {
    const freq = 'כל ההקלטות';
    if (!acc[freq]) acc[freq] = [];
    acc[freq].push(rec);
    return acc;
  }, {} as { [key: string]: Recording[] });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex relative" dir="rtl">
      {/* Doppler Branding */}
      <div className="absolute top-6 left-8 z-30 pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src="/logo.jpeg" 
              alt="Doppler Logo" 
              className="w-20 h-20 rounded-full border-4 border-blue-500/30 shadow-2xl object-cover bg-white"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback if logo.jpeg doesn't exist or fails
                (e.target as HTMLImageElement).src = "https://picsum.photos/seed/military/200/200";
              }}
            />
            <div className="absolute inset-0 rounded-full ring-2 ring-inset ring-black/10" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 drop-shadow-sm font-brand">
              דופל"ר
            </span>
            <div className="h-1 w-14 bg-blue-600 rounded-full -mt-1" />
          </div>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className="w-20 md:w-64 bg-white border-l border-slate-200 flex flex-col items-center md:items-stretch py-8 px-4 gap-8 shadow-sm z-20">
        <div className="hidden md:block px-4">
          <h2 className="text-xl font-bold text-blue-600">תפריט</h2>
        </div>
        
        <nav className="flex flex-col gap-2 w-full">
          <button 
            onClick={() => setActiveTab('recordings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'recordings' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Mic className="w-5 h-5" />
            <span className="hidden md:inline font-bold font-brand">יצירת הקלטות</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('scenarios')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'scenarios' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ListMusic className="w-5 h-5" />
            <span className="hidden md:inline font-bold font-brand">יצירת תרחיש</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('archive')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'archive' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Archive className="w-5 h-5" />
            <span className="hidden md:inline font-bold font-brand">ארכיון הקלטות</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'recordings' ? (
              <motion.div 
                key="recordings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Header */}
                <header className="text-center space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight text-slate-900 font-brand">יצירת הקלטות</h1>
                  <p className="text-slate-500">נהל את ההקלטות שלך עם פרמטרים מותאמים אישית</p>
                </header>

                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center justify-between"
                    >
                      <span>{error}</span>
                      <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Recorder Section */}
                  <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Mic className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-xl font-semibold">הקלטה חדשה</h2>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 block">שם ההקלטה</label>
                        <input 
                          type="text" 
                          value={recordingName}
                          onChange={(e) => setRecordingName(e.target.value)}
                          placeholder="לדוגמה: בדיקת שטח 1"
                          disabled={isRecording}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="pt-6 flex flex-col items-center gap-4">
                      <div className="text-4xl font-mono font-medium text-slate-700 tabular-nums">
                        {formatTime(recordingTime)}
                      </div>

                      {!isRecording ? (
                        <button
                          onClick={startRecording}
                          className="group relative flex items-center justify-center w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full transition-all shadow-lg shadow-red-200 active:scale-95"
                        >
                          <Mic className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                          <span className="absolute -bottom-8 text-sm font-medium text-red-500">הקלט</span>
                        </button>
                      ) : (
                        <button
                          onClick={stopRecording}
                          className="group relative flex items-center justify-center w-20 h-20 bg-slate-800 hover:bg-slate-900 rounded-full transition-all shadow-lg shadow-slate-300 active:scale-95"
                        >
                          <Square className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                          <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping" />
                          <span className="absolute -bottom-8 text-sm font-medium text-slate-800">עצור</span>
                        </button>
                      )}
                    </div>
                  </section>

                  {/* List Section */}
                  <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                          <ListMusic className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-xl font-semibold">הקלטות שמורות</h2>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-500 rounded-full">
                        {recordings.length} פריטים
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[500px] space-y-4 custom-scrollbar pl-2">
                      <AnimatePresence mode="popLayout">
                        {recordings.length === 0 ? (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2"
                          >
                            <Radio className="w-12 h-12 opacity-20" />
                            <p>אין הקלטות עדיין</p>
                          </motion.div>
                        ) : (
                          recordings.map((rec) => (
                            <motion.div
                              key={rec.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="group bg-slate-50 hover:bg-white hover:shadow-md border border-slate-100 rounded-2xl p-4 transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => playRecording(rec)}
                                  className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                                    currentlyPlaying === rec.id 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                  }`}
                                >
                                  {currentlyPlaying === rec.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                                </button>

                                <div className="flex-1 min-w-0">
                                  {editingId === rec.id && editingField === 'name' ? (
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="w-full px-2 py-1 border border-blue-300 rounded outline-none text-slate-900 font-semibold"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(rec.id)}
                                      />
                                      <button onClick={() => saveEdit(rec.id)} className="text-blue-600 hover:text-blue-800">
                                        <Save className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <h3 
                                      onClick={() => startEditing(rec, 'name')}
                                      className="font-semibold text-slate-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                                      title="לחץ לעריכת שם"
                                    >
                                      {rec.name}
                                    </h3>
                                  )}
                                  
                                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatTime(rec.duration)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button
                                    onClick={() => downloadRecording(rec)}
                                    title="הורד למחשב"
                                    className="p-2 text-slate-400 hover:text-blue-500 transition-all"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteRecording(rec.id)}
                                    title="מחק"
                                    className="p-2 text-slate-400 hover:text-red-500 transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>
                  </section>
                </div>
              </motion.div>
            ) : activeTab === 'scenarios' ? (
              <motion.div 
                key="scenarios"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Header */}
                <header className="text-center space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight text-slate-900 font-brand">יצירת תרחיש</h1>
                  <p className="text-slate-500">בנה צירי זמן מורכבים ושלב הקלטות</p>
                </header>

                <div className="grid grid-cols-1 gap-8">
                  {/* Timeline Management */}
                  <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100 space-y-6">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-semibold">ניהול צירי זמן</h2>
                      </div>
                      
                      <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                        <input 
                          type="text" 
                          value={newTimelineName}
                          onChange={(e) => setNewTimelineName(e.target.value)}
                          placeholder="שם ציר זמן (למשל: גדודי)"
                          className="w-full md:w-48 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="relative w-full md:w-40">
                          <input 
                            type="number" 
                            step="0.025"
                            value={newTimelineFrequency}
                            onChange={(e) => setNewTimelineFrequency(e.target.value)}
                            placeholder="תדר (MHz)"
                            className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 pl-8 ${
                              error && activeTab === 'scenarios' ? 'border-red-300 ring-red-100' : 'border-slate-200 focus:ring-blue-500'
                            }`}
                          />
                          <Radio className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        </div>
                        <button 
                          onClick={addTimeline}
                          className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-all whitespace-nowrap w-full md:w-auto"
                        >
                          הוסף ציר זמן
                        </button>
                      </div>
                    </div>

                    {error && activeTab === 'scenarios' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
                      >
                        <div className="p-1 bg-red-100 rounded-full mt-0.5">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-red-800">{error}</p>
                          <p className="text-xs text-red-600">
                            התדר חייב להיות בטווח של 33.000 עד 87.975 MHz, ובקפיצות של 25 kHz (למשל: 33.025, 33.050).
                          </p>
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-8">
                      {timelines.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                          <p>טרם נוצרו צירי זמן. הוסף אחד כדי להתחיל.</p>
                        </div>
                      ) : (
                        timelines.map(tl => (
                          <div key={tl.id} className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <h3 className="font-bold text-lg text-slate-800">{tl.name}</h3>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                  {formatFrequencyForDisplay(tl.frequency)} MHz
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                              <div className="flex flex-col gap-2 w-full md:w-auto">
                                <span className="text-xs font-bold text-slate-500 mr-1">הוספת הקלטה לציר:</span>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1 md:w-64">
                                    <select 
                                      className="w-full pl-8 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                                      value={tl.selectedRecordingId || ''}
                                      onChange={(e) => updateTimelineSearch(tl.id, { selectedRecordingId: e.target.value })}
                                    >
                                      <option value="">בחר הקלטה...</option>
                                      {getSortedRecordings(tl.searchQuery, tl.sortMethod).map(r => (
                                        <option key={r.id} value={r.id}>{r.name} ({formatTime(r.duration)})</option>
                                      ))}
                                    </select>
                                    <ListMusic className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const rec = recordings.find(r => r.id === tl.selectedRecordingId);
                                      if (rec) addItemToTimeline(tl.id, { type: 'recording', recordingId: rec.id, name: rec.name, duration: rec.duration });
                                    }}
                                    disabled={!tl.selectedRecordingId}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-sm active:scale-95"
                                  >
                                    הוסף
                                  </button>
                                </div>
                              </div>

                              <div className="h-px md:h-10 w-full md:w-px bg-slate-100" />

                              <div className="flex flex-col gap-2 w-full md:w-auto">
                                <span className="text-xs font-bold text-slate-500 mr-1">סינון וחיפוש:</span>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1 md:w-48">
                                    <input 
                                      type="text"
                                      placeholder="חפש הקלטה..."
                                      value={tl.searchQuery || ''}
                                      onChange={(e) => {
                                        const query = e.target.value;
                                        const sorted = getSortedRecordings(query, tl.sortMethod);
                                        updateTimelineSearch(tl.id, { 
                                          searchQuery: query,
                                          selectedRecordingId: sorted.length > 0 ? sorted[0].id : ''
                                        });
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && tl.selectedRecordingId) {
                                          const rec = recordings.find(r => r.id === tl.selectedRecordingId);
                                          if (rec) addItemToTimeline(tl.id, { type: 'recording', recordingId: rec.id, name: rec.name, duration: rec.duration });
                                        }
                                      }}
                                      className="w-full pl-8 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <Archive className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                  </div>
                                  <select 
                                    value={tl.sortMethod || 'newest'}
                                    onChange={(e) => updateTimelineSearch(tl.id, { sortMethod: e.target.value as any })}
                                    className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                  >
                                    <option value="newest">חדש לישן</option>
                                    <option value="oldest">ישן לחדש</option>
                                    <option value="alphabetical">א-ב</option>
                                    <option value="numerical">מספור שמי</option>
                                  </select>
                                </div>
                              </div>

                              <div className="h-px md:h-10 w-full md:w-px bg-slate-100" />

                              <div className="flex items-center gap-2 mt-auto pb-1">
                                <button 
                                  onClick={() => addItemToTimeline(tl.id, { type: 'delay', duration: 5 })}
                                  className="flex items-center gap-2 text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all font-bold"
                                >
                                  <Clock className="w-4 h-4" />
                                  הוסף השהיה
                                </button>
                                <button 
                                  onClick={() => setTimelines(prev => prev.filter(t => t.id !== tl.id))}
                                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                  title="מחק ציר זמן"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <Reorder.Group 
                              axis="x" 
                              values={tl.items} 
                              onReorder={(newItems) => reorderTimelineItems(tl.id, newItems)}
                              className="flex items-center gap-2 overflow-x-auto py-4 min-h-[140px] custom-scrollbar"
                            >
                              <AnimatePresence mode="popLayout">
                                {tl.items.map((item) => {
                                  const itemCount = tl.items.length;
                                  const minWidth = itemCount > 8 ? 'min-w-[90px]' : itemCount > 5 ? 'min-w-[110px]' : 'min-w-[140px]';
                                  const padding = itemCount > 8 ? 'p-2' : 'p-4';
                                  const fontSize = itemCount > 8 ? 'text-xs' : 'text-sm';
                                  
                                  return (
                                    <Reorder.Item 
                                      key={item.id}
                                      value={item}
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.8 }}
                                      className={`flex-shrink-0 ${padding} rounded-2xl border shadow-sm flex flex-col gap-1 ${minWidth} relative group cursor-grab active:cursor-grabbing select-none transition-all duration-300 ${
                                        item.type === 'recording' ? 'bg-white border-blue-100' : 'bg-indigo-50 border-indigo-100'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                          {item.type === 'recording' ? 'הקלטה' : 'השהיה'}
                                        </span>
                                        <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-400 transition-colors" />
                                      </div>
                                      <span className={`font-semibold ${fontSize} truncate`}>{item.name || formatDuration(item.duration)}</span>
                                      
                                      {item.type === 'delay' ? (
                                        <div className="flex flex-col gap-1 mt-1">
                                          <div className="flex items-center gap-1">
                                            <input 
                                              type="number"
                                              min="0.5"
                                              step="0.1"
                                              value={item.duration}
                                              onChange={(e) => updateDelayDuration(tl.id, item.id, parseFloat(e.target.value) || 0.5)}
                                              className={`${itemCount > 8 ? 'w-10' : 'w-16'} px-1 py-0.5 text-[10px] border border-indigo-200 rounded outline-none focus:ring-1 focus:ring-indigo-400`}
                                            />
                                            <span className="text-[9px] text-slate-500">ש'</span>
                                          </div>
                                          {item.duration >= 60 && itemCount <= 8 && (
                                            <span className="text-[9px] text-indigo-400 font-medium">
                                              ({formatDuration(item.duration)})
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-slate-500">{item.duration}s</span>
                                      )}
                                      
                                      <button 
                                        onClick={() => removeItemFromTimeline(tl.id, item.id)}
                                        className="absolute -top-2 -left-2 bg-white shadow-md rounded-full p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </Reorder.Item>
                                  );
                                })}
                              </AnimatePresence>
                            </Reorder.Group>
                          </div>
                        ))
                      )}
                    </div>

                    {timelines.length > 0 && mergingStatus !== 'preview' && (
                      <div className="pt-8 flex justify-center">
                        <button 
                          onClick={() => mergeTimelines()}
                          disabled={mergingStatus === 'merging'}
                          className={`flex items-center gap-3 px-12 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95 ${
                            mergingStatus === 'merging' ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                          }`}
                        >
                          {mergingStatus === 'merging' ? (
                            <>
                              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                              מבצע איחוד...
                            </>
                          ) : (
                            <>
                              <Save className="w-6 h-6" />
                              איחוד צירי זמן
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Merged Preview Section */}
                    <AnimatePresence>
                      {mergingStatus === 'preview' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-8 border-t border-slate-100 space-y-6"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-50 rounded-lg">
                                <Play className="w-5 h-5 text-green-600" />
                              </div>
                              <h2 className="text-xl font-semibold">תצוגה מקדימה של האיחוד</h2>
                            </div>
                            <button 
                              onClick={() => setMergingStatus('idle')}
                              className="text-sm text-slate-400 hover:text-slate-600"
                            >
                              ביטול
                            </button>
                          </div>

                          <div className="bg-slate-900 rounded-3xl p-6 overflow-x-auto custom-scrollbar flex items-center gap-1 min-h-[120px]">
                            {mergedTimeline.map((item, idx) => {
                              const startTime = mergedTimeline.slice(0, idx).reduce((acc, it) => acc + it.duration, 0);
                              return (
                                <div key={item.id} className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setPreviewCurrentTime(startTime);
                                      playPreview(startTime);
                                    }}
                                    className={`flex-shrink-0 px-4 py-3 rounded-xl border flex flex-col items-center min-w-[120px] transition-all hover:scale-105 active:scale-95 ${
                                      previewIndex === idx ? 'ring-2 ring-green-400 scale-105' : ''
                                    } ${
                                      item.type === 'recording' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
                                    }`}
                                  >
                                    {item.type === 'recording' ? (
                                      <div className="flex flex-col items-center gap-1 w-full text-center">
                                        <div className="flex flex-col leading-none">
                                          <span className="text-[7px] opacity-80">ציר זמן:</span>
                                          <span className="text-[10px] font-bold truncate max-w-[100px]">{item.timelineName}</span>
                                        </div>
                                        <div className="flex flex-col leading-none">
                                          <span className="text-[7px] opacity-80">שם ההקלטה:</span>
                                          <span className="text-[10px] font-bold truncate max-w-[100px]">{item.name}</span>
                                        </div>
                                        <div className="flex flex-col leading-none">
                                          <span className="text-[7px] opacity-80">תדר:</span>
                                          <span className="text-[10px] font-bold">{formatFrequencyForDisplay(item.frequency)} MHz</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="text-[8px] font-bold uppercase opacity-70">השהיה</span>
                                        <span className="text-xs font-semibold">{item.duration}s</span>
                                      </>
                                    )}
                                  </button>
                                  {idx < mergedTimeline.length - 1 && (
                                    <div className="w-4 h-0.5 bg-slate-700" />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-mono text-slate-500 px-1">
                              <span>{formatTime(Math.floor(previewCurrentTime))}</span>
                              <span>{formatTime(Math.floor(previewTotalDuration))}</span>
                            </div>
                            <div 
                              className="h-3 bg-slate-100 rounded-full overflow-hidden cursor-pointer relative group"
                              onClick={handleProgressBarClick}
                            >
                              <motion.div 
                                className="absolute inset-y-0 right-0 bg-blue-500"
                                initial={false}
                                animate={{ width: `${(previewCurrentTime / previewTotalDuration) * 100}%` }}
                                transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
                              />
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-blue-400/10 transition-opacity" />
                            </div>
                          </div>

                          <div className="flex justify-center gap-4">
                            <button 
                              onClick={() => playPreview()}
                              className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all ${
                                isPreviewPlaying ? 'bg-amber-500 text-white' : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600'
                              }`}
                            >
                              {isPreviewPlaying ? (
                                <>
                                  <Pause className="w-5 h-5" />
                                  עצור השמעה
                                </>
                              ) : (
                                <>
                                  <Play className="w-5 h-5" />
                                  השמע תצוגה מקדימה
                                </>
                              )}
                            </button>
                            <button 
                              onClick={finalizeMerge}
                              className="bg-green-600 text-white px-12 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-green-200 hover:bg-green-700 transition-all active:scale-95"
                            >
                              אישור ושמירה כ-WAV
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="archive"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Header */}
                <header className="text-center space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight text-slate-900 font-brand">ארכיון הקלטות</h1>
                  <p className="text-slate-500">נהל את ההקלטות והתרחישים המאוחדים שלך</p>
                </header>

                <div className="space-y-6">
                  {/* Scenarios Section */}
                  {scenarios.length > 0 && (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                      <button 
                        onClick={() => toggleGroup('scenarios_group')}
                        className="w-full px-6 py-5 flex items-center justify-between bg-indigo-50/30 hover:bg-indigo-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                            <ListMusic className="w-5 h-5" />
                          </div>
                          <div className="text-right">
                            <h3 className="font-bold text-lg text-slate-900">תרחישים מאוחדים</h3>
                            <p className="text-xs text-slate-500">{scenarios.length} תרחישים שמורים</p>
                          </div>
                        </div>
                        {expandedGroups.includes('scenarios_group') ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </button>

                      <AnimatePresence>
                        {expandedGroups.includes('scenarios_group') && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-100"
                          >
                            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                              <div className="relative max-w-md">
                                <input 
                                  type="text"
                                  placeholder="חפש תרחיש..."
                                  value={archiveSearchQueries['scenarios_group'] || ''}
                                  onChange={(e) => setArchiveSearchQueries(prev => ({ ...prev, scenarios_group: e.target.value }))}
                                  className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <Archive className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              </div>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {scenarios
                                .filter(rec => !archiveSearchQueries['scenarios_group'] || rec.name.toLowerCase().includes(archiveSearchQueries['scenarios_group'].toLowerCase()))
                                .map(rec => (
                                <div key={rec.id} className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100 hover:border-blue-200 transition-all group">
                                  <button
                                    onClick={() => playRecording(rec)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                      currentlyPlaying === rec.id 
                                      ? 'bg-blue-600 text-white shadow-lg' 
                                      : 'bg-white text-slate-600 border border-slate-200 hover:text-blue-600 hover:border-blue-300'
                                    }`}
                                  >
                                    {currentlyPlaying === rec.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                                  </button>
                                  
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-900 truncate">{rec.name}</h4>
                                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(rec.duration)}</span>
                                      <span>{new Date(rec.timestamp).toLocaleDateString()}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => downloadRecording(rec)} className="p-1.5 text-slate-400 hover:text-blue-500"><Save className="w-4 h-4" /></button>
                                    <button onClick={() => deleteRecording(rec.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {Object.keys(groupedRecordings).length === 0 && scenarios.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400">
                      <Archive className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg">הארכיון ריק עדיין</p>
                    </div>
                  ) : (
                    (Object.entries(groupedRecordings) as [string, Recording[]][]).map(([freq, items]) => (
                      <div key={freq} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                        <button 
                          onClick={() => toggleGroup(freq)}
                          className="w-full px-6 py-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                              <Radio className="w-5 h-5" />
                            </div>
                            <div className="text-right">
                              <h3 className="font-bold text-lg text-slate-900">{freq}</h3>
                              <p className="text-xs text-slate-500">{items.length} הקלטות</p>
                            </div>
                          </div>
                          {expandedGroups.includes(freq) ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </button>

                        <AnimatePresence>
                          {expandedGroups.includes(freq) && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-slate-100"
                            >
                              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                                <div className="relative max-w-md">
                                  <input 
                                    type="text"
                                    placeholder="חפש הקלטה..."
                                    value={archiveSearchQueries[freq] || ''}
                                    onChange={(e) => setArchiveSearchQueries(prev => ({ ...prev, [freq]: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <Archive className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                </div>
                              </div>
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {items
                                  .filter(rec => !archiveSearchQueries[freq] || rec.name.toLowerCase().includes(archiveSearchQueries[freq].toLowerCase()))
                                  .map(rec => (
                                  <div key={rec.id} className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100 hover:border-blue-200 transition-all group">
                                    <button
                                      onClick={() => playRecording(rec)}
                                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                        currentlyPlaying === rec.id 
                                        ? 'bg-blue-600 text-white shadow-lg' 
                                        : 'bg-white text-slate-600 border border-slate-200 hover:text-blue-600 hover:border-blue-300'
                                      }`}
                                    >
                                      {currentlyPlaying === rec.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                                    </button>
                                    
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-slate-900 truncate">{rec.name}</h4>
                                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(rec.duration)}</span>
                                        <span>{new Date(rec.timestamp).toLocaleDateString()}</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                      <button onClick={() => downloadRecording(rec)} className="p-1.5 text-slate-400 hover:text-blue-500"><Save className="w-4 h-4" /></button>
                                      <button onClick={() => deleteRecording(rec.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Conflict Modal */}
      <AnimatePresence>
        {showConflictModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowConflictModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Radio className="w-8 h-8 text-amber-500 animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">זוהתה התנגשות!</h2>
                <p className="text-slate-500">נמצאו הקלטות חופפות בין צירי זמן שונים. כיצד תרצה להמשיך?</p>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => mergeTimelines(true)}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all flex flex-col items-center"
                >
                  <span>תיקון אוטומטי</span>
                  <span className="text-[10px] font-normal opacity-80">מתן עדיפות לציר זמן גדודי והזזת השאר</span>
                </button>
                <button 
                  onClick={() => setShowConflictModal(false)}
                  className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול ושינוי ידני
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Naming Modal */}
      <AnimatePresence>
        {showNamingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowNamingModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Save className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 font-brand">שם התרחיש</h2>
                <p className="text-slate-500">תן שם לתרחיש המאוחד החדש שלך</p>
              </div>

              <div className="space-y-4">
                <input 
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="למשל: תרחיש אימון בוקר"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && confirmFinalizeMerge()}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={confirmFinalizeMerge}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
                  >
                    שמור
                  </button>
                  <button 
                    onClick={() => setShowNamingModal(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
