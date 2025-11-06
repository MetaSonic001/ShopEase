import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Lightbulb, AlertTriangle, ZapOff, TrendingDown, ExternalLink } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import ExportToolbar from '../../components/ExportToolbar';
import { useRef } from 'react';

interface ErrorGroup {
  message: string;
  count: number;
  avgDuration: number;
}

interface RageSelector {
  selector: string;
  count: number;
}

interface SlowPage {
  url: string;
  lcpP75: number;
  count: number;
}

interface RecommendedAction {
  priority: 'high' | 'medium';
  type: 'error' | 'rage' | 'performance';
  title: string;
  description: string;
  actionUrl?: string;
}

interface WeeklySummary {
  topErrors: ErrorGroup[];
  topRageSelectors: RageSelector[];
  topSlowPages: SlowPage[];
  recommendedActions: RecommendedAction[];
}

const InsightsDashboard: React.FC = () => {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/insights/weekly-summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load insights' });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    return priority === 'high' ? (
      <Badge variant="destructive">High Priority</Badge>
    ) : (
      <Badge variant="secondary">Medium Priority</Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'rage':
        return <ZapOff className="w-5 h-5 text-orange-600" />;
      case 'performance':
        return <TrendingDown className="w-5 h-5 text-blue-600" />;
      default:
        return <Lightbulb className="w-5 h-5 text-yellow-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Auto-Insights</h1>
          <p className="text-muted-foreground mt-1">AI-powered insights from the past 7 days</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Analyzing data...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Auto-Insights</h1>
          <p className="text-muted-foreground mt-1">AI-powered insights from the past 7 days</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No insights available</h3>
            <p className="text-muted-foreground">Not enough data to generate insights yet</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const csvGroups = summary
    ? [
        {
          label: 'Top Errors',
          headers: ['Message', 'Count', 'Avg Duration (ms)'],
          rows: summary.topErrors.map((e) => [e.message, e.count, e.avgDuration]),
          filename: 'insights-top-errors.csv',
        },
        {
          label: 'Rage Selectors',
          headers: ['Selector', 'Incidents'],
          rows: summary.topRageSelectors.map((r) => [r.selector, r.count]),
          filename: 'insights-rage-selectors.csv',
        },
        {
          label: 'Slow Pages',
          headers: ['URL', 'LCP P75 (s)', 'Count'],
          rows: summary.topSlowPages.map((p) => [p.url, p.lcpP75, p.count]),
          filename: 'insights-slow-pages.csv',
        },
      ]
    : [];

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auto-Insights</h1>
          <p className="text-muted-foreground mt-1">AI-powered insights from the past 7 days</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportToolbar
            targetRef={containerRef as any}
            pdfFilename="insights.pdf"
            csvGroups={csvGroups}
            size="sm"
          />
          <Button onClick={fetchSummary} variant="outline">Refresh</Button>
        </div>
      </div>

      {/* Recommended Actions */}
      {summary.recommendedActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Recommended Actions
            </CardTitle>
            <CardDescription>Priority actions to improve user experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.recommendedActions.map((action, idx) => (
                <div
                  key={idx}
                  className="p-4 border rounded-lg flex items-start gap-3 hover:bg-accent transition-colors"
                >
                  {getTypeIcon(action.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{action.title}</h4>
                      {getPriorityBadge(action.priority)}
                    </div>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  {action.actionUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={action.actionUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Top JavaScript Errors
            </CardTitle>
            <CardDescription>Most frequent errors in the past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.topErrors.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No errors recorded</p>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Error Message</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Avg Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.topErrors.map((error, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs max-w-[300px] truncate">
                          {error.message}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">{error.count}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {error.avgDuration.toFixed(0)}ms
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Top Rage Selectors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ZapOff className="w-5 h-5 text-orange-600" />
              Top Rage Click Selectors
            </CardTitle>
            <CardDescription>Elements with most rage clicks detected</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.topRageSelectors.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No rage clicks detected</p>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CSS Selector</TableHead>
                      <TableHead className="text-right">Incidents</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.topRageSelectors.map((selector, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs max-w-[350px] truncate">
                          {selector.selector}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{selector.count}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slow Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-blue-600" />
            Slow Loading Pages (LCP P75 {'>'} 2.5s)
          </CardTitle>
          <CardDescription>Pages with poor Largest Contentful Paint performance</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.topSlowPages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">All pages loading within threshold</p>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page URL</TableHead>
                    <TableHead className="text-right">LCP P75 (s)</TableHead>
                    <TableHead className="text-right">Sample Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.topSlowPages.map((page, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs max-w-[500px] truncate">
                        {page.url}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{page.lcpP75.toFixed(2)}s</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {page.count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightsDashboard;
