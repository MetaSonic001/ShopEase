import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Replayer, unpack } from 'rrweb';
import { getReplayConsolePlugin } from '@rrweb/rrweb-plugin-console-replay';
import api from '../../services/api';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Download,
  Share2,
  Clock,
  Monitor,
  Smartphone,
  Tablet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Terminal,
  Bug,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SessionData {
  sessionId: string;
  userId?: string;
  projectId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  events: any[];
  consoleLogs?: any[];
  networkRequests?: any[];
  errors?: any[];
  metadata?: {
    url: string;
    title: string;
    device: {
      deviceType: string;
      browser: string;
      os: string;
      screen: string;
    };
  };
  stats?: {
    totalEvents?: number;
    eventsByType?: Record<string, number>;
  };
}

const SessionReplayPlayerNew: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Player state
  const [replayer, setReplayer] = useState<Replayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [skipInactive, setSkipInactive] = useState(true);
  
  // Event tracking
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      isInitializedRef.current = false;
    };
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/tracking/sessions/${sessionId}`);
      const data = response.data.session || response.data; // Handle both formats
      
      console.log('[SessionReplayPlayer] Fetched session:', {
        sessionId: data.sessionId,
        eventCount: data.events?.length || 0,
        hasMetadata: !!data.metadata,
      });
      
      setSessionData(data);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load session';
      console.error('[SessionReplayPlayer] Error:', errorMessage, err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[SessionReplayPlayer] Effect triggered:', {
      hasSessionData: !!sessionData,
      hasEvents: !!sessionData?.events,
      eventCount: sessionData?.events?.length || 0,
      hasContainer: !!playerContainerRef.current,
      isInitialized: isInitializedRef.current
    });
    
    if (!sessionData || !sessionData.events || sessionData.events.length === 0) {
      console.log('[SessionReplayPlayer] No session data or events');
      return;
    }

    if (!playerContainerRef.current) {
      console.log('[SessionReplayPlayer] Player container not ready');
      return;
    }

    // Prevent double initialization in React strict mode
    if (isInitializedRef.current) {
      console.log('[SessionReplayPlayer] Already initialized, skipping');
      return;
    }
    
    console.log('[SessionReplayPlayer] Starting initialization...');
    isInitializedRef.current = true;

    try {
      // Validate and unpack events
      // Events can be in 3 formats:
      // 1. Packed strings (new format) - compressed event chunks
      // 2. Packed objects {v, e} (old packed format)
      // 3. Unpacked objects {type, timestamp, data} (original format)
      
      let allEvents: any[] = [];
      
      sessionData.events.forEach((event: any, index: number) => {
        if (typeof event === 'string') {
          // New format: packed string - unpack it
          console.log(`[SessionReplayPlayer] Unpacking event ${index + 1}/${sessionData.events.length}, length: ${event.length}`);
          try {
            const unpacked = unpack(event);
            console.log(`[SessionReplayPlayer] Unpacked type:`, typeof unpacked, Array.isArray(unpacked));
            
            // unpack() returns an object with numeric keys and a 'v' version property
            // e.g., {0: event1, 1: event2, 2: event3, v: 'v1'}
            // We need to convert this to an array
            if (unpacked && typeof unpacked === 'object' && !Array.isArray(unpacked)) {
              // Extract numeric keys and convert to array
              const unpackedAny = unpacked as any;
              const events = Object.keys(unpackedAny)
                .filter(key => !isNaN(Number(key))) // Only numeric keys
                .map(key => unpackedAny[key])
                .filter(e => e && typeof e === 'object'); // Filter out any nulls
              
              console.log(`[SessionReplayPlayer] Extracted ${events.length} events from packed object`);
              allEvents.push(...events);
            } else if (Array.isArray(unpacked)) {
              allEvents.push(...unpacked);
            } else if (unpacked && typeof unpacked === 'object') {
              allEvents.push(unpacked);
            }
          } catch (err) {
            console.error('[SessionReplayPlayer] Failed to unpack string event:', err);
            console.error('[SessionReplayPlayer] Event preview:', event.substring(0, 200));
          }
        } else if (event.v && typeof event === 'object' && !Array.isArray(event)) {
          // Old packed format: {0: event1, 1: event2, v: 'v1'} object
          const events = Object.keys(event)
            .filter(key => !isNaN(Number(key)))
            .map(key => event[key])
            .filter(e => e && typeof e === 'object');
          allEvents.push(...events);
        } else if (event.type !== undefined) {
          // Already unpacked format: {type, timestamp, data}
          allEvents.push(event);
        }
      });

      // Validate event structure
      const invalidEvents = allEvents.filter(
        (e: any) => typeof e.type !== 'number' || typeof e.timestamp !== 'number' || !e.data
      );

      if (invalidEvents.length > 0) {
        console.error('[SessionReplayPlayer] Found invalid events:', invalidEvents.length);
        setError('Some events have invalid format and may not replay correctly');
      }

      if (allEvents.length < 2) {
        setError('Not enough events to replay session');
        return;
      }

      // Sort events by timestamp
      const sortedEvents = [...allEvents].sort((a, b) => a.timestamp - b.timestamp);

      // Calculate event type breakdown
      const counts: Record<string, number> = {};
      sortedEvents.forEach((event: any) => {
        const typeName = getEventTypeName(event.type);
        counts[typeName] = (counts[typeName] || 0) + 1;
      });
      setEventCounts(counts);

      console.log('[SessionReplayPlayer] Initializing replayer with', sortedEvents.length, 'events');
      console.log('[SessionReplayPlayer] Event breakdown:', counts);

      // Initialize replayer
      const replayerInstance = new Replayer(sortedEvents, {
        root: playerContainerRef.current,
        speed: playbackSpeed,
        skipInactive: skipInactive,
        showWarning: true,
        showDebug: import.meta.env.DEV,
        blockClass: 'rr-block',
        mouseTail: {
          duration: 500,
          lineCap: 'round',
          lineWidth: 2,
          strokeStyle: '#3b82f6',
        },
        plugins: [
          getReplayConsolePlugin(),
        ],
        unpackFn: unpack,
      });

      // Set up event listeners
      replayerInstance.on('start', () => {
        console.log('[SessionReplayPlayer] Replay started');
        setIsPlaying(true);
      });

      replayerInstance.on('pause', () => {
        console.log('[SessionReplayPlayer] Replay paused');
        setIsPlaying(false);
      });

      replayerInstance.on('finish', () => {
        console.log('[SessionReplayPlayer] Replay finished');
        setIsPlaying(false);
        setCurrentTime(duration);
      });

      replayerInstance.on('skip-start', (event: any) => {
        console.log('[SessionReplayPlayer] Skipping inactive period at', event?.speed || 1, 'x speed');
      });

      replayerInstance.on('skip-end', (event: any) => {
        console.log('[SessionReplayPlayer] Resumed from skip at', event?.speed || 1, 'x speed');
      });

      replayerInstance.on('mouse-interaction', (event: any) => {
        console.log('[SessionReplayPlayer] Mouse interaction:', event?.type, event?.target);
      });

      replayerInstance.on('event-cast', (event: any) => {
        setCurrentEvent(event);
      });

      replayerInstance.on('resize', (event: any) => {
        console.log('[SessionReplayPlayer] Viewport resized:', event?.width, 'x', event?.height);
      });

      // Calculate duration
      const firstTimestamp = sortedEvents[0].timestamp;
      const lastTimestamp = sortedEvents[sortedEvents.length - 1].timestamp;
      const durationMs = lastTimestamp - firstTimestamp;
      setDuration(durationMs);

      // Set up progress tracking
      progressIntervalRef.current = window.setInterval(() => {
        if (replayerInstance && typeof replayerInstance.getCurrentTime === 'function') {
          const time = replayerInstance.getCurrentTime();
          setCurrentTime(time);
        }
      }, 100);

      setReplayer(replayerInstance);
      console.log('[SessionReplayPlayer] Replayer initialized successfully');

      // Apply styling to constrain and scale rrweb content within the frame
      const applyScaling = () => {
        if (playerContainerRef.current) {
          const wrapper = playerContainerRef.current.querySelector('.replayer-wrapper');
          const iframe = playerContainerRef.current.querySelector('.replayer-wrapper iframe');
          
          if (wrapper instanceof HTMLElement && iframe instanceof HTMLElement) {
            const container = playerContainerRef.current;
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            // Get the iframe's natural dimensions
            const iframeWidth = parseInt(iframe.getAttribute('width') || '1024');
            const iframeHeight = parseInt(iframe.getAttribute('height') || '963');
            
            // Calculate scale to fit and fill the container
            const scaleX = containerWidth / iframeWidth;
            const scaleY = containerHeight / iframeHeight;
            const scale = Math.min(scaleX, scaleY); // Fit to container
            
            console.log('[SessionReplayPlayer] Scaling replayer:', {
              containerWidth,
              containerHeight,
              iframeWidth,
              iframeHeight,
              scaleX,
              scaleY,
              finalScale: scale
            });
            
            // Apply transform to center and scale the wrapper
            wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
            wrapper.style.transformOrigin = 'center center';
            wrapper.style.width = `${iframeWidth}px`;
            wrapper.style.height = `${iframeHeight}px`;
          }
        }
      };

      setTimeout(applyScaling, 100);
      
      // Reapply scaling on window resize
      window.addEventListener('resize', applyScaling);

      // Cleanup function - only clear interval, don't destroy replayer
      // The replayer will be cleaned up when the component unmounts (separate effect)
      return () => {
        console.log('[SessionReplayPlayer] Cleaning up interval');
        window.removeEventListener('resize', applyScaling);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      };
    } catch (err: any) {
      console.error('[SessionReplayPlayer] Error initializing replayer:', err);
      setError(`Failed to initialize replay: ${err.message || 'Unknown error'}`);
      isInitializedRef.current = false; // Reset on error
    }
  }, [sessionData]);

  // Cleanup replayer on component unmount
  useEffect(() => {
    return () => {
      console.log('[SessionReplayPlayer] Component unmounting, destroying replayer');
      if (replayer && typeof replayer.destroy === 'function') {
        try {
          replayer.destroy();
        } catch (e) {
          console.error('[SessionReplayPlayer] Error destroying replayer:', e);
        }
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  // Update playback speed
  useEffect(() => {
    if (replayer && typeof replayer.setConfig === 'function') {
      replayer.setConfig({ speed: playbackSpeed });
    }
  }, [playbackSpeed, replayer]);

  // Update skip inactive
  useEffect(() => {
    if (replayer && typeof replayer.setConfig === 'function') {
      replayer.setConfig({ skipInactive: skipInactive });
    }
  }, [skipInactive, replayer]);

  const handlePlayPause = () => {
    if (!replayer) return;

    if (isPlaying) {
      replayer.pause();
      setIsPlaying(false);
    } else {
      replayer.play(currentTime);
      setIsPlaying(true);
    }
  };

  const handleSkipForward = () => {
    if (!replayer) return;
    const newTime = Math.min(currentTime + 5000, duration);
    setCurrentTime(newTime);
    if (isPlaying) {
      replayer.play(newTime);
    } else {
      replayer.pause(newTime);
    }
  };

  const handleSkipBack = () => {
    if (!replayer) return;
    const newTime = Math.max(currentTime - 5000, 0);
    setCurrentTime(newTime);
    if (isPlaying) {
      replayer.play(newTime);
    } else {
      replayer.pause(newTime);
    }
  };

  const handleSeek = (value: number[]) => {
    if (!replayer) return;
    const newTime = value[0];
    setCurrentTime(newTime);
    if (isPlaying) {
      replayer.play(newTime);
    } else {
      replayer.pause(newTime);
    }
  };

  const handleRestart = () => {
    if (!replayer) return;
    replayer.pause(0);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;

    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleString();
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

  const getDeviceIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-blue-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  const getLogIcon = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Terminal className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session replay...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'Session not found'}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/admin/analytics/recordings')} className="mt-4">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Recordings
        </Button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Modern Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50 px-6 py-4 shadow-sm">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/analytics/recordings')}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Monitor className="h-5 w-5 text-blue-500" />
                <span>Session Replay</span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {sessionData.metadata?.title || sessionId}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {sessionData.metadata?.device && (
              <Badge variant="outline" className="flex items-center space-x-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                {getDeviceIcon(sessionData.metadata.device.deviceType)}
                <span className="text-blue-700 dark:text-blue-300 font-medium">{sessionData.metadata.device.deviceType}</span>
              </Badge>
            )}
            <Button variant="outline" size="sm" className="hover:bg-gray-100 dark:hover:bg-gray-700">
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="hover:bg-gray-100 dark:hover:bg-gray-700">
              <Share2 className="h-4 w-4 mr-1.5" />
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Player */}
          <div className="xl:col-span-2 space-y-4">
            <Card className="overflow-hidden shadow-xl border-0 bg-white dark:bg-gray-800">
              <CardContent className="p-0">
                {/* Video Container */}
                <div className="bg-gradient-to-br from-gray-900 to-black relative overflow-hidden rounded-t-lg" style={{ aspectRatio: '16/9' }}>
                  <div
                    ref={playerContainerRef}
                    className="absolute inset-0 overflow-hidden"
                    style={{
                      width: '100%',
                      height: '100%',
                    }}
                  />
                  {!replayer && !error && (
                    <div className="absolute inset-0 flex items-center justify-center text-white z-10">
                      <div className="text-center space-y-4">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/20 border-t-blue-500 mx-auto"></div>
                          <Monitor className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-500" />
                        </div>
                        <p className="text-gray-300 font-medium">Loading session replay...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay Info Badge */}
                  {replayer && (
                    <div className="absolute top-4 left-4 z-10">
                      <Badge className="bg-black/50 backdrop-blur-sm text-white border-white/20">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(currentTime)}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Modern Controls */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5 space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <Slider
                      value={[currentTime]}
                      max={duration}
                      step={100}
                      onValueChange={handleSeek}
                      className="w-full cursor-pointer [&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-400 [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-blue-500/50"
                    />
                    <div className="flex justify-between text-xs font-medium text-gray-400">
                      <span className="tabular-nums">{formatTime(currentTime)}</span>
                      <span className="tabular-nums">{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePlayPause}
                        disabled={!replayer}
                        className="text-white hover:bg-white/10 hover:text-blue-400 transition-colors h-10 w-10 p-0"
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5" fill="currentColor" />
                        ) : (
                          <Play className="h-5 w-5" fill="currentColor" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSkipBack}
                        disabled={!replayer}
                        className="text-white hover:bg-white/10 hover:text-blue-400 transition-colors h-10 w-10 p-0"
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSkipForward}
                        disabled={!replayer}
                        className="text-white hover:bg-white/10 hover:text-blue-400 transition-colors h-10 w-10 p-0"
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRestart}
                        disabled={!replayer}
                        className="text-white hover:bg-white/10 hover:text-blue-400 transition-colors h-10 w-10 p-0"
                        title="Restart"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Separator orientation="vertical" className="h-6 mx-2 bg-gray-700" />
                      <span className="text-sm font-mono text-gray-300 px-3 py-2 bg-black/30 rounded-md">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Select
                        value={playbackSpeed.toString()}
                        onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}
                      >
                        <SelectTrigger className="w-28 h-9 bg-black/30 border-gray-700 text-white hover:bg-black/50 transition-colors">
                          <SelectValue placeholder="Speed" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="0.25" className="text-white hover:bg-gray-700">0.25x</SelectItem>
                          <SelectItem value="0.5" className="text-white hover:bg-gray-700">0.5x</SelectItem>
                          <SelectItem value="1" className="text-white hover:bg-gray-700">1x Normal</SelectItem>
                          <SelectItem value="1.5" className="text-white hover:bg-gray-700">1.5x</SelectItem>
                          <SelectItem value="2" className="text-white hover:bg-gray-700">2x</SelectItem>
                          <SelectItem value="4" className="text-white hover:bg-gray-700">4x</SelectItem>
                          <SelectItem value="8" className="text-white hover:bg-gray-700">8x</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsMuted(!isMuted)}
                        className="text-white hover:bg-white/10 hover:text-blue-400 transition-colors h-9 w-9 p-0"
                        title={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleFullscreen}
                        className="text-white hover:bg-white/10 hover:text-blue-400 transition-colors h-9 w-9 p-0"
                        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                      >
                        {isFullscreen ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Stats */}
            <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center space-x-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span>Session Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Duration</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatTime(duration)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Events</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{sessionData.events?.length || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Started</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(sessionData.startTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</p>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="events" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 bg-gray-100 dark:bg-gray-900 p-1 rounded-none">
                    <TabsTrigger value="events" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                      <Monitor className="h-4 w-4 mr-1.5" />
                      Events
                    </TabsTrigger>
                    <TabsTrigger value="console" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                      <Terminal className="h-4 w-4 mr-1.5" />
                      Console
                    </TabsTrigger>
                    <TabsTrigger value="errors" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                      <Bug className="h-4 w-4 mr-1.5" />
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="events" className="p-4">
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center space-x-2">
                          <Monitor className="h-4 w-4 text-blue-500" />
                          <span>Event Breakdown</span>
                        </h3>
                        <div className="space-y-2">
                          {Object.entries(eventCounts).map(([type, count]) => (
                            <div key={type} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{type}</span>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                {count}
                              </Badge>
                            </div>
                          ))}
                        </div>
                        {currentEvent && (
                          <>
                            <Separator className="my-4" />
                            <div className="space-y-2">
                              <h3 className="text-sm font-semibold">Current Event</h3>
                              <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
                                {JSON.stringify(currentEvent, null, 2)}
                              </pre>
                            </div>
                          </>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="console" className="p-4">
                    <ScrollArea className="h-[600px]">
                      {sessionData.consoleLogs && sessionData.consoleLogs.length > 0 ? (
                        <div className="space-y-2">
                          {sessionData.consoleLogs.map((log: any, index: number) => (
                            <div key={index} className="flex items-start space-x-3 text-xs p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0">
                              {getLogIcon(log.level)}
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </p>
                                <p className="font-mono text-sm break-words">{log.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                          <Terminal className="h-12 w-12 mb-3 opacity-50" />
                          <p>No console logs recorded</p>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="errors" className="p-4">
                    <ScrollArea className="h-[600px]">
                      {sessionData.errors && sessionData.errors.length > 0 ? (
                        <div className="space-y-3">
                          {sessionData.errors.map((error: any, index: number) => (
                            <Alert key={index} variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                              <Bug className="h-4 w-4" />
                              <AlertTitle className="text-sm font-semibold">
                                {error.type || 'Error'}
                              </AlertTitle>
                              <AlertDescription className="text-xs mt-1">
                                <p className="font-mono">{error.message}</p>
                                {error.stack && (
                                  <pre className="mt-2 text-xs overflow-x-auto bg-black/10 dark:bg-black/30 p-2 rounded">
                                    {error.stack}
                                  </pre>
                                )}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                          <CheckCircle2 className="h-12 w-12 mb-3 opacity-50 text-green-500" />
                          <p>No errors recorded</p>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionReplayPlayerNew;
