import { useEffect, useRef, useState } from 'react';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack,
  Terminal,
  Network,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
  Globe,
  Monitor
} from 'lucide-react';

interface SessionData {
  sessionId: string;
  events: any[];
  consoleLogs?: any[];
  networkRequests?: any[];
  metadata: {
    url: string;
    title: string;
    device: {
      type: string;
      browser: string;
      screen: string;
    };
  };
  startTime: string;
  endTime?: string;
  duration?: number;
  stats?: {
    totalEvents: number;
    totalClicks: number;
    totalScrolls: number;
  };
}

interface SessionReplayPlayerFullProps {
  sessionId: string;
  apiUrl?: string;
}

export default function SessionReplayPlayerFull({ sessionId, apiUrl }: SessionReplayPlayerFullProps) {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('replay');

  const API_BASE = apiUrl || import.meta.env.VITE_API_BASE || 'http://localhost:5000';

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/tracking/sessions/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`);
      }

        const data = await response.json();
        const session = (data as any)?.session ?? data; // API returns { session }
        console.log('Session data:', session);
        setSessionData(session);
    } catch (err: any) {
      console.error('Error fetching session:', err);
      setError(err.message || 'Failed to load session recording');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionData || !playerContainerRef.current) return;
    // rrweb-player requires at least two events (e.g., Meta + FullSnapshot)
    if (!Array.isArray(sessionData.events) || sessionData.events.length < 2) return;

    try {
      // Clear previous player
      if (playerContainerRef.current) {
        playerContainerRef.current.innerHTML = '';
      }

      const sortedEvents = [...sessionData.events].sort((a, b) => (a?.timestamp || 0) - (b?.timestamp || 0));

      const playerInstance = new rrwebPlayer({
        target: playerContainerRef.current,
        props: {
          events: sortedEvents,
          autoPlay: false,
          width: 1024,
          height: 768,
          showController: true,
          speedOption: [1, 2, 4, 8],
          tags: {},
        },
      });

      setPlayer(playerInstance);

      return () => {
        try {
          if (playerInstance && typeof (playerInstance as any).$destroy === 'function') {
            (playerInstance as any).$destroy();
          }
        } catch (e) {
          console.error('Error destroying player:', e);
        }
      };
    } catch (err: any) {
      console.error('Error initializing player:', err);
      setError('Failed to initialize replay player');
    }
  }, [sessionData]);

  const handlePlay = () => {
    if (player && typeof player.play === 'function') {
      player.play();
    }
  };

  const handlePause = () => {
    if (player && typeof player.pause === 'function') {
      player.pause();
    }
  };

  const handleSkipForward = () => {
    if (player && typeof player.goto === 'function' && typeof player.getCurrentTime === 'function') {
      const currentTime = player.getCurrentTime();
      player.goto(currentTime + 5000);
    }
  };

  const handleSkipBack = () => {
    if (player && typeof player.goto === 'function' && typeof player.getCurrentTime === 'function') {
      const currentTime = player.getCurrentTime();
      player.goto(Math.max(0, currentTime - 5000));
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Terminal className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-blue-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading session recording...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-12">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-sm text-destructive mb-2">Error: {error}</p>
            <Button variant="outline" onClick={fetchSessionData}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sessionData || !Array.isArray(sessionData.events) || sessionData.events.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-12">
          <p className="text-center text-sm text-muted-foreground">
            No recording events found for this session
          </p>
        </CardContent>
      </Card>
    );
  }

  if (sessionData.events.length < 2) {
    return (
      <Card className="w-full">
        <CardContent className="p-12">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Not enough events to initialize the player yet.
            </p>
            <p className="text-xs text-muted-foreground">
              The replay requires at least two events (initial snapshot). Try again in a few seconds.
            </p>
            <Button variant="outline" onClick={fetchSessionData} className="mt-2">Refresh</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Info Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Session Replay</span>
            <Badge variant="outline">Session {sessionData.sessionId.slice(0, 8)}...</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">URL</p>
                <p className="font-medium truncate">{sessionData.metadata?.url || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Device</p>
                <p className="font-medium">{sessionData.metadata?.device?.type || 'Unknown'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Started</p>
                <p className="font-medium">{new Date(sessionData.startTime).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Events</p>
                <p className="font-medium">{sessionData.events.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="replay">
            <Play className="h-4 w-4 mr-2" />
            Replay
          </TabsTrigger>
          <TabsTrigger value="console">
            <Terminal className="h-4 w-4 mr-2" />
            Console ({sessionData.consoleLogs?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="network">
            <Network className="h-4 w-4 mr-2" />
            Network ({sessionData.networkRequests?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="details">
            <Info className="h-4 w-4 mr-2" />
            Details
          </TabsTrigger>
        </TabsList>

        {/* Replay Tab */}
        <TabsContent value="replay" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" variant="outline" onClick={handleSkipBack}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handlePause}>
                  <Pause className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handlePlay}>
                  <Play className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleSkipForward}>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              <div 
                ref={playerContainerRef} 
                className="w-full border rounded-lg overflow-hidden bg-slate-50"
                style={{ minHeight: '600px' }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Console Tab */}
        <TabsContent value="console">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Console Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full">
                {sessionData.consoleLogs && sessionData.consoleLogs.length > 0 ? (
                  <div className="space-y-2 font-mono text-sm">
                    {sessionData.consoleLogs.map((log, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded border ${
                          log.level === 'error' ? 'bg-red-50 border-red-200' :
                          log.level === 'warn' ? 'bg-yellow-50 border-yellow-200' :
                          log.level === 'info' ? 'bg-blue-50 border-blue-200' :
                          'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {getLogIcon(log.level)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {log.level.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {((log.timestamp || 0) / 1000).toFixed(2)}s
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap break-all">{log.message}</p>
                            {log.trace && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs text-muted-foreground">
                                  Stack trace
                                </summary>
                                <pre className="mt-1 text-xs overflow-x-auto">{log.trace}</pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-12">No console logs captured</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Tab */}
        <TabsContent value="network">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Network Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full">
                {sessionData.networkRequests && sessionData.networkRequests.length > 0 ? (
                  <div className="space-y-2">
                    {sessionData.networkRequests.map((request, index) => (
                      <div key={index} className="p-3 rounded border bg-slate-50">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {request.method || 'GET'}
                              </Badge>
                              <span className={`text-sm font-medium ${getStatusColor(request.status)}`}>
                                {request.status || '---'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {request.duration}ms
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {((request.timestamp || 0) / 1000).toFixed(2)}s
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate font-mono">
                              {request.url}
                            </p>
                            {request.error && (
                              <p className="text-xs text-red-600 mt-1">{request.error}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {request.size && request.size !== 'unknown' && (
                              <p className="text-xs text-muted-foreground">{request.size}B</p>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {request.type || 'fetch'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-12">No network requests captured</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Session Information</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Session ID:</dt>
                  <dd className="font-mono">{sessionData.sessionId}</dd>
                  
                  <dt className="text-muted-foreground">Started:</dt>
                  <dd>{new Date(sessionData.startTime).toLocaleString()}</dd>
                  
                  {sessionData.endTime && (
                    <>
                      <dt className="text-muted-foreground">Ended:</dt>
                      <dd>{new Date(sessionData.endTime).toLocaleString()}</dd>
                    </>
                  )}
                  
                  {sessionData.duration && (
                    <>
                      <dt className="text-muted-foreground">Duration:</dt>
                      <dd>{Math.round(sessionData.duration / 1000)}s</dd>
                    </>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Device Information</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Type:</dt>
                  <dd>{sessionData.metadata?.device?.type || 'Unknown'}</dd>
                  
                  <dt className="text-muted-foreground">Screen:</dt>
                  <dd>{sessionData.metadata?.device?.screen || 'Unknown'}</dd>
                  
                  <dt className="text-muted-foreground">Browser:</dt>
                  <dd className="truncate" title={sessionData.metadata?.device?.browser}>
                    {sessionData.metadata?.device?.browser || 'Unknown'}
                  </dd>
                </dl>
              </div>

              {sessionData.stats && (
                <div>
                  <h3 className="font-semibold mb-2">Statistics</h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Total Events:</dt>
                    <dd>{sessionData.stats.totalEvents}</dd>
                    
                    <dt className="text-muted-foreground">Total Clicks:</dt>
                    <dd>{sessionData.stats.totalClicks}</dd>
                    
                    <dt className="text-muted-foreground">Total Scrolls:</dt>
                    <dd>{sessionData.stats.totalScrolls}</dd>
                  </dl>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Raw Events JSON</h3>
                <ScrollArea className="h-[300px] w-full border rounded p-4 bg-slate-50">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(sessionData.events, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
