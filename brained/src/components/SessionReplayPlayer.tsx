import { useEffect, useRef, useState } from 'react';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Pause, SkipForward, SkipBack } from 'lucide-react';

interface SessionReplayPlayerProps {
  sessionId: string;
  apiUrl?: string;
}

interface SessionData {
  events: any[];
  metadata: {
    url: string;
    title: string;
    device: {
      type: string;
      browser: string;
      screen: string;
    };
  };
  startedAt: string;
  duration?: number;
}

export default function SessionReplayPlayer({ sessionId, apiUrl }: SessionReplayPlayerProps) {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [player, setPlayer] = useState<any>(null);

  const API_BASE = apiUrl || import.meta.env.VITE_API_BASE || 'http://localhost:5000';

  useEffect(() => {
    // Fetch session data
    const fetchSessionData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/tracking/sessions/${sessionId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch session: ${response.statusText}`);
        }

        const data = await response.json();
        setSessionData(data);
      } catch (err: any) {
        console.error('Error fetching session:', err);
        setError(err.message || 'Failed to load session recording');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId, API_BASE]);

  useEffect(() => {
    // Initialize rrweb player once we have data
    if (!sessionData || !playerContainerRef.current || sessionData.events.length === 0) return;

    try {
      const playerInstance = new rrwebPlayer({
        target: playerContainerRef.current,
        props: {
          events: sessionData.events,
          autoPlay: false,
          width: 1024,
          height: 768,
          showController: true,
          speedOption: [1, 2, 4, 8],
          tags: {},
        },
      });

      setPlayer(playerInstance);

      // Cleanup on unmount
            return () => {
              if (playerInstance) {
                try {
                  // rrweb-player exposes destroy; use any-cast + optional chaining to avoid TS errors
                  (playerInstance as any).destroy?.();
                } catch (e) {
                  console.error('Error destroying player:', e);
                }
              }
            };
    } catch (err: any) {
      console.error('Error initializing player:', err);
      setError('Failed to initialize replay player');
    }
  }, [sessionData]);

  const handlePlay = () => {
    if (player) {
      player.play();
    }
  };

  const handlePause = () => {
    if (player) {
      player.pause();
    }
  };

  const handleSkipForward = () => {
    if (player) {
      const currentTime = player.getCurrentTime();
      player.goto(currentTime + 5000); // Skip forward 5 seconds
    }
  };

  const handleSkipBack = () => {
    if (player) {
      const currentTime = player.getCurrentTime();
      player.goto(Math.max(0, currentTime - 5000)); // Skip back 5 seconds
    }
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
            <p className="text-sm text-destructive mb-2">Error: {error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sessionData || sessionData.events.length === 0) {
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Session Replay</CardTitle>
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>URL:</strong> {sessionData.metadata?.url}</p>
          <p><strong>Device:</strong> {sessionData.metadata?.device?.type} ({sessionData.metadata?.device?.screen})</p>
          <p><strong>Started:</strong> {new Date(sessionData.startedAt).toLocaleString()}</p>
          <p><strong>Events:</strong> {sessionData.events.length}</p>
          {sessionData.duration && <p><strong>Duration:</strong> {Math.round(sessionData.duration / 1000)}s</p>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Additional controls */}
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

          {/* Player container */}
          <div 
            ref={playerContainerRef} 
            className="w-full border rounded-lg overflow-hidden bg-slate-50"
            style={{ minHeight: '600px' }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
