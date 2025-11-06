import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Replayer, unpack } from 'rrweb';
import io, { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import api from '../../services/api';
import {
  Circle,
  Square,
  Monitor,
  Activity,
  Users,
  Clock,
  Download,
  Share2,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Bug,
  Wifi,
  WifiOff,
  Play,
  Pause,
  SkipForward,
  SkipBack,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

interface LiveEvent {
  type: number;
  timestamp: number;
  data: any;
}

interface RecordingMetadata {
  userAgent?: string;
  screen?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
}

type UserId = string;

interface LiveEventEx extends LiveEvent {
  __userId?: UserId;
}

const LiveRecordingDashboard: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<LiveEventEx[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [metadata, setMetadata] = useState<RecordingMetadata>({});
  const [eventStats, setEventStats] = useState({
    total: 0,
    clicks: 0,
    scrolls: 0,
    inputs: 0,
  });
  const [liveDelayMs, setLiveDelayMs] = useState<number>(1200);
  const [selectedUserId, setSelectedUserId] = useState<UserId | 'all'>('all');
  const [userIds, setUserIds] = useState<UserId[]>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const replayerRef = useRef<Replayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const allEventsRef = useRef<LiveEventEx[]>([]);
  const userMetadataMapRef = useRef<Map<UserId, RecordingMetadata>>(new Map());

  // Check for active recording on mount (Resume feature)
  useEffect(() => {
    const checkActiveRecording = async () => {
      try {
        const response = await api.get('/api/tracking/recording-status');
        if (response.data.isRecording) {
          console.log('[LiveRecording] Found active recording:', response.data.recordingId);
          
          // Ask user if they want to resume
          const resume = window.confirm(
            `There's an active recording in progress. Would you like to resume viewing it?`
          );
          
          if (resume) {
            setRecordingId(response.data.recordingId);
            setIsRecording(true);
            recordingStartTimeRef.current = response.data.startTime || Date.now();
            console.log('[LiveRecording] Resuming recording:', response.data.recordingId);
          }
        }
      } catch (err) {
        console.error('[LiveRecording] Failed to check recording status:', err);
      }
    };

    checkActiveRecording();
  }, []); // Run once on mount

  useEffect(() => {
    // Initialize WebSocket connection
    console.log('[LiveRecording] Connecting to WebSocket...');
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[LiveRecording] Connected to WebSocket');
      setIsConnected(true);
      setIsReconnecting(false);
      setError(null);
      
      // Join admin room for live recording
      socket.emit('join-admin-room', { adminId: 'admin-user' });

      // If we were recording before disconnect, rejoin the recording room
      if (recordingId) {
        console.log('[LiveRecording] Reconnecting to recording:', recordingId);
        socket.emit('admin-start-recording', {
          recordingId,
          projectId: 'default',
          adminId: 'admin-user',
          timestamp: Date.now(),
        });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[LiveRecording] Disconnected from WebSocket:', reason);
      setIsConnected(false);
      
      // Show reconnecting status unless manually disconnected
      if (reason !== 'io client disconnect') {
        setIsReconnecting(true);
        setError('Connection lost. Attempting to reconnect...');
      }
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[LiveRecording] Reconnection attempt ${attemptNumber}...`);
      setIsReconnecting(true);
      setError(`Reconnecting... (attempt ${attemptNumber})`);
    });

    socket.on('reconnect_failed', () => {
      console.error('[LiveRecording] Reconnection failed after all attempts');
      setIsReconnecting(false);
      setError('Failed to reconnect. Please refresh the page.');
    });

    socket.on('connect_error', (err) => {
      console.error('[LiveRecording] Connection error:', err);
      setError('Failed to connect to server. Please check your connection.');
      setIsConnected(false);
    });

    // Listen for active users count
    socket.on('active-users', (count: number) => {
      setActiveUsers(count);
    });

    // Listen for live events from users
    socket.on('live-event', (data: { recordingId: string; event: any; metadata?: any }) => {
      if (data.recordingId === recordingId) {
        console.log('[LiveRecording] Received live event:', data.event.type);
        
        // Unpack if string
        let event = data.event as any;
        if (typeof event === 'string') {
          try {
            const unpacked = unpack(event);
            event = Array.isArray(unpacked) ? unpacked[0] : unpacked;
          } catch (err) {
            console.error('[LiveRecording] Failed to unpack event:', err);
          }
        }
        const eventUserId: UserId = data?.metadata?.userId || 'anonymous';
        const enrichedEvent: LiveEventEx = { ...(event as LiveEvent), __userId: eventUserId };
        
        // Track user ids and metadata
        setUserIds((prev) => (prev.includes(eventUserId) ? prev : [...prev, eventUserId]));
        if (data.metadata) {
          userMetadataMapRef.current.set(eventUserId, {
            ...(userMetadataMapRef.current.get(eventUserId) || {}),
            ...data.metadata,
          });
          // Update panel metadata to reflect currently selected user
          const selectedMeta = selectedUserId === 'all'
            ? data.metadata
            : userMetadataMapRef.current.get(selectedUserId) || data.metadata;
          setMetadata((prev) => ({ ...prev, ...selectedMeta }));
        }
        
        // Push into master list
        allEventsRef.current.push(enrichedEvent);

        // Compute visible events with delay and user filter
        const cutoff = Date.now() - liveDelayMs;
        const visible = allEventsRef.current.filter((e) => {
          const withinDelay = e.timestamp <= cutoff;
          const userMatch = selectedUserId === 'all' || e.__userId === selectedUserId;
          return withinDelay && userMatch;
        });

        // Update stats based on visible
        const stats = visible.reduce(
          (acc, e) => {
            acc.total += 1;
            if (e.type === 3 && (e as any).data?.source === 2) {
              const interactionType = (e as any).data.type;
              if (interactionType === 2) acc.clicks += 1;
            } else if (e.type === 3 && (e as any).data?.source === 3) {
              acc.scrolls += 1;
            } else if (e.type === 3 && (e as any).data?.source === 5) {
              acc.inputs += 1;
            }
            return acc;
          },
          { total: 0, clicks: 0, scrolls: 0, inputs: 0 }
        );
        setEventStats(stats);

        // Throttle replayer updates
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        updateTimeoutRef.current = window.setTimeout(() => {
          setLiveEvents(visible);
          updateReplayer(visible);
        }, 500);
      }
    });

    // Listen for user joined
    socket.on('user-joined', (data: { userId: string; metadata: any }) => {
      console.log('[LiveRecording] User joined:', data.userId);
      setUserIds((prev) => (prev.includes(data.userId) ? prev : [...prev, data.userId]));
      userMetadataMapRef.current.set(data.userId, {
        ...(userMetadataMapRef.current.get(data.userId) || {}),
        ...data.metadata,
      });
      // If "all" is selected, show the last joined user's metadata for context
      if (selectedUserId === 'all') {
        setMetadata((prev) => ({ ...prev, ...data.metadata }));
      }
    });

    socketRef.current = socket;

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      socket.disconnect();
    };
  }, [recordingId]);

  const updateReplayer = (events: LiveEvent[]) => {
    if (!playerContainerRef.current || events.length < 2) return;

    try {
      // Destroy old replayer
      if (replayerRef.current) {
        try {
          replayerRef.current.destroy();
        } catch (e) {
          console.error('[LiveRecording] Error destroying replayer:', e);
        }
      }

      // Sort events by timestamp
      const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

      // Create new replayer with all events
      const replayer = new Replayer(sortedEvents, {
        root: playerContainerRef.current,
        speed: 1,
        skipInactive: false,
        showWarning: false,
        showDebug: false,
        liveMode: true, // Important for live streaming
        mouseTail: {
          duration: 500,
          lineCap: 'round',
          lineWidth: 2,
          strokeStyle: '#3b82f6',
        },
      });

      // Play to the latest position
      const latestTimestamp = sortedEvents[sortedEvents.length - 1].timestamp;
      replayer.play(latestTimestamp);

      replayerRef.current = replayer;

      // Apply scaling
      setTimeout(() => {
        applyReplayerScaling();
      }, 100);
    } catch (err) {
      console.error('[LiveRecording] Error updating replayer:', err);
    }
  };

  const applyReplayerScaling = () => {
    if (!playerContainerRef.current) return;

    const wrapper = playerContainerRef.current.querySelector('.replayer-wrapper') as HTMLElement;
    const iframe = playerContainerRef.current.querySelector('iframe') as HTMLElement;

    if (wrapper && iframe) {
      const container = playerContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const iframeWidth = parseInt(iframe.getAttribute('width') || '1024');
      const iframeHeight = parseInt(iframe.getAttribute('height') || '768');

      const scaleX = containerWidth / iframeWidth;
      const scaleY = containerHeight / iframeHeight;
      const scale = Math.min(scaleX, scaleY);

      wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
      wrapper.style.transformOrigin = 'center center';
      wrapper.style.position = 'absolute';
      wrapper.style.top = '50%';
      wrapper.style.left = '50%';
      wrapper.style.width = `${iframeWidth}px`;
      wrapper.style.height = `${iframeHeight}px`;
    }
  };

  const startRecording = () => {
    const newRecordingId = uuidv4();
    setRecordingId(newRecordingId);
    setIsRecording(true);
    setLiveEvents([]);
    setEventStats({ total: 0, clicks: 0, scrolls: 0, inputs: 0 });
    setMetadata({});
    setUserIds([]);
    allEventsRef.current = [];
    userMetadataMapRef.current = new Map();
    recordingStartTimeRef.current = Date.now();

    console.log('[LiveRecording] Starting recording:', newRecordingId);

    // Emit to server to broadcast to all users
    if (socketRef.current) {
      socketRef.current.emit('admin-start-recording', {
        recordingId: newRecordingId,
        projectId: 'default',
        adminId: 'admin-user',
        timestamp: Date.now(),
      });
    }
  };

  const stopRecording = async () => {
    console.log('[LiveRecording] Stopping recording:', recordingId);
    setIsRecording(false);

    // Emit to server to stop recording on all users
    if (socketRef.current && recordingId) {
      socketRef.current.emit('admin-stop-recording', {
        recordingId,
        timestamp: Date.now(),
      });

      // Save recording to database
      try {
        const duration = Date.now() - recordingStartTimeRef.current;
        // Save full event set (not just filtered view)
        await api.post('/api/tracking/save-recording', {
          sessionId: recordingId,
          projectId: 'default',
          events: allEventsRef.current,
          metadata: {
            ...metadata,
            recordingType: 'admin-triggered',
            duration,
          },
          startTime: new Date(recordingStartTimeRef.current),
          endTime: new Date(),
          duration,
        });

        console.log('[LiveRecording] Recording saved successfully');
        alert(`Recording saved! ${liveEvents.length} events captured over ${Math.round(duration / 1000)}s`);
      } catch (err: any) {
        console.error('[LiveRecording] Failed to save recording:', err);
        alert('Failed to save recording: ' + (err.response?.data?.message || err.message));
      }
    }

    setRecordingId(null);
  };

  const getEventTypeName = (type: number): string => {
    const eventTypes: Record<number, string> = {
      0: 'DomContentLoaded',
      1: 'Load',
      2: 'FullSnapshot',
      3: 'IncrementalSnapshot',
      4: 'Meta',
      5: 'Custom',
      6: 'Plugin',
    };
    return eventTypes[type] || `Unknown(${type})`;
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Recompute visible events on user/delay change
  useEffect(() => {
    const cutoff = Date.now() - liveDelayMs;
    const visible = allEventsRef.current.filter((e) => {
      const withinDelay = e.timestamp <= cutoff;
      const userMatch = selectedUserId === 'all' || e.__userId === selectedUserId;
      return withinDelay && userMatch;
    });
    setLiveEvents(visible);
    // Update stats for new view
    const stats = visible.reduce(
      (acc, e) => {
        acc.total += 1;
        if (e.type === 3 && (e as any).data?.source === 2) {
          const interactionType = (e as any).data.type;
          if (interactionType === 2) acc.clicks += 1;
        } else if (e.type === 3 && (e as any).data?.source === 3) {
          acc.scrolls += 1;
        } else if (e.type === 3 && (e as any).data?.source === 5) {
          acc.inputs += 1;
        }
        return acc;
      },
      { total: 0, clicks: 0, scrolls: 0, inputs: 0 }
    );
    setEventStats(stats);
    // Update metadata view based on selected user
    if (selectedUserId !== 'all') {
      const meta = userMetadataMapRef.current.get(selectedUserId);
      if (meta) setMetadata((prev) => ({ ...prev, ...meta }));
    }
    // Trigger replayer refresh
    updateReplayer(visible);
  }, [selectedUserId, liveDelayMs]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50 px-6 py-4 shadow-sm">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Monitor className="h-6 w-6 text-red-500" />
                <span>Live Session Recording</span>
                {isRecording && (
                  <Badge variant="destructive" className="ml-3 animate-pulse">
                    <Circle className="w-3 h-3 mr-1 fill-current" />
                    RECORDING
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Capture and view user sessions in real-time across all devices
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge
                variant={isConnected ? 'default' : 'destructive'}
                className="flex items-center space-x-1.5"
              >
                {isReconnecting ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Reconnecting...</span>
                  </>
                ) : isConnected ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span>Disconnected</span>
                  </>
                )}
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1.5">
                <Users className="w-4 h-4" />
                <span>
                  {activeUsers > 0 
                    ? `${activeUsers} active user${activeUsers !== 1 ? 's' : ''}` 
                    : 'No active users'}
                </span>
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-[1800px] mx-auto px-6 pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Player */}
          <div className="xl:col-span-2 space-y-4">
            {/* Recording Controls */}
            <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">Recording Controls</h3>
                    {isRecording && recordingStartTimeRef.current > 0 && (
                      <p className="text-sm text-gray-500">
                        Duration: {formatDuration(Date.now() - recordingStartTimeRef.current)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    {!isRecording ? (
                      <Button
                        onClick={startRecording}
                        disabled={!isConnected}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        size="lg"
                      >
                        <Circle className="w-5 h-5 mr-2 fill-current" />
                        Start Live Recording
                      </Button>
                    ) : (
                      <Button onClick={stopRecording} variant="destructive" size="lg">
                        <Square className="w-5 h-5 mr-2" />
                        Stop Recording
                      </Button>
                    )}
                  </div>
                </div>

                {/* Live delay + user filter controls */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <label className="text-sm text-gray-600 dark:text-gray-300">Live delay</label>
                    <select
                      className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-900"
                      value={liveDelayMs}
                      onChange={(e) => setLiveDelayMs(parseInt(e.target.value, 10))}
                    >
                      <option value={0}>0 ms (no delay)</option>
                      <option value={500}>500 ms</option>
                      <option value={1000}>1 s</option>
                      <option value={2000}>2 s</option>
                      <option value={3000}>3 s</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-3">
                    <label className="text-sm text-gray-600 dark:text-gray-300">User</label>
                    <select
                      className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-900"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value as any)}
                    >
                      <option value="all">All users</option>
                      {userIds.map((id) => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Stats */}
                {isRecording && (
                  <div className="mt-6 grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Events</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {eventStats.total}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">Clicks</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {eventStats.clicks}
                      </p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Scrolls</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {eventStats.scrolls}
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                      <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Inputs</p>
                      <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                        {eventStats.inputs}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Video Player */}
            <Card className="overflow-hidden shadow-xl border-0 bg-white dark:bg-gray-800">
              <CardContent className="p-0">
                <div
                  className="bg-gradient-to-br from-gray-900 to-black relative overflow-hidden"
                  style={{ aspectRatio: '16/9', minHeight: '500px' }}
                >
                  {isRecording && (
                    <div className="absolute top-4 left-4 z-10">
                      <Badge className="bg-red-600/90 backdrop-blur-sm text-white border-0 shadow-lg animate-pulse">
                        <Circle className="w-3 h-3 mr-1 fill-current animate-pulse" />
                        LIVE
                      </Badge>
                    </div>
                  )}

                  <div
                    ref={playerContainerRef}
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: '100%', height: '100%' }}
                  />

                  {!isRecording && liveEvents.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-white z-10">
                      <div className="text-center space-y-4">
                        <Monitor className="h-16 w-16 mx-auto text-gray-600" />
                        <p className="text-gray-400 font-medium">
                          Click "Start Live Recording" to begin capturing user sessions
                        </p>
                      </div>
                    </div>
                  )}

                  {isRecording && liveEvents.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-white z-10">
                      <div className="text-center space-y-4">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500/20 border-t-red-500 mx-auto"></div>
                          <Activity className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500 animate-pulse" />
                        </div>
                        <p className="text-gray-300 font-medium">Waiting for user activity...</p>
                        <p className="text-sm text-gray-500">
                          Recording will start once a user begins browsing
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Session Info */}
            {metadata.url && (
              <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center space-x-2">
                    <Monitor className="h-4 w-4 text-blue-500" />
                    <span>Session Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Current Page
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {metadata.url}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Screen Size
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {metadata.screen || 'Unknown'}
                      </p>
                    </div>
                    {metadata.userId && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          User ID
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {metadata.userId}
                        </p>
                      </div>
                    )}
                    {metadata.userAgent && (
                      <div className="space-y-1 col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          User Agent
                        </p>
                        <p className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">
                          {metadata.userAgent}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side Panel - Event Feed */}
          <div className="space-y-4">
            <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span>Live Event Feed</span>
                  </span>
                  <Badge variant="secondary">{liveEvents.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="p-4 space-y-2">
                    {liveEvents.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                        <Terminal className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No events yet</p>
                      </div>
                    ) : (
                      liveEvents
                        .slice()
                        .reverse()
                        .map((event, index) => (
                          <div
                            key={`${event.timestamp}-${index}`}
                            className="flex items-start space-x-3 text-xs p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-gray-100 dark:border-gray-800"
                          >
                            <div
                              className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                event.type === 2
                                  ? 'bg-green-500'
                                  : event.type === 3
                                  ? 'bg-blue-500'
                                  : 'bg-gray-400'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {getEventTypeName(event.type)}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                  {new Date(event.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              {event.data?.source && (
                                <p className="text-gray-600 dark:text-gray-400">
                                  Source: {event.data.source}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveRecordingDashboard;
