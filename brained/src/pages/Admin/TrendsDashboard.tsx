import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { BarChart2, TrendingUp, AlertTriangle, Download } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import ExportToolbar from '../../components/ExportToolbar';
import { useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrendBucket {
  hour: string;
  count: number;
}

const TrendsDashboard: React.FC = () => {
  const [rageTrends, setRageTrends] = useState<TrendBucket[]>([]);
  const [errorTrends, setErrorTrends] = useState<TrendBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState<24 | 168>(24);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTrends();
  }, [hours]);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const [rageResponse, errorResponse] = await Promise.all([
        api.get(`/api/trends/rage?hours=${hours}`),
        api.get(`/api/trends/errors?hours=${hours}`),
      ]);
      setRageTrends(rageResponse.data);
      setErrorTrends(errorResponse.data);
    } catch (error) {
      console.error('Failed to fetch trends:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load trends',
        description: 'An error occurred while fetching trend data.'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = () => {
    // Merge rage and error trends by hour
    const hourMap = new Map<string, { hour: string; rage: number; errors: number }>();

    rageTrends.forEach((bucket) => {
      hourMap.set(bucket.hour, { hour: bucket.hour, rage: bucket.count, errors: 0 });
    });

    errorTrends.forEach((bucket) => {
      const existing = hourMap.get(bucket.hour);
      if (existing) {
        existing.errors = bucket.count;
      } else {
        hourMap.set(bucket.hour, { hour: bucket.hour, rage: 0, errors: bucket.count });
      }
    });

    return Array.from(hourMap.values()).sort((a, b) => a.hour.localeCompare(b.hour));
  };

  const formatHourLabel = (hour: string) => {
    // Format YYYY-MM-DDTHH to more readable format
    const date = new Date(hour + ':00:00');
    if (hours === 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
  };

  const csvGroups = [
    {
      label: 'Combined Trends',
      headers: ['Hour', 'Rage Incidents', 'JS Errors'],
      rows: formatChartData().map((row) => [row.hour, row.rage, row.errors]),
      filename: `trends-${hours}h.csv`,
    },
    {
      label: 'Rage Only',
      headers: ['Hour', 'Rage Incidents'],
      rows: rageTrends.map((row) => [row.hour, row.count]),
      filename: `trends-rage-${hours}h.csv`,
    },
    {
      label: 'Errors Only',
      headers: ['Hour', 'JS Errors'],
      rows: errorTrends.map((row) => [row.hour, row.count]),
      filename: `trends-errors-${hours}h.csv`,
    },
  ];

  const chartData = formatChartData();
  const totalRage = rageTrends.reduce((sum, b) => sum + b.count, 0);
  const totalErrors = errorTrends.reduce((sum, b) => sum + b.count, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Trends</h1>
          <p className="text-muted-foreground mt-1">Hourly trends for rage clicks and JS errors</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading trends...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trends</h1>
          <p className="text-muted-foreground mt-1">Hourly trends for rage clicks and JS errors</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={hours === 24 ? 'default' : 'outline'}
            onClick={() => setHours(24)}
            size="sm"
          >
            24 Hours
          </Button>
          <Button
            variant={hours === 168 ? 'default' : 'outline'}
            onClick={() => setHours(168)}
            size="sm"
          >
            7 Days
          </Button>
          <ExportToolbar targetRef={containerRef as any} pdfFilename={`trends-${hours}h.pdf`} csvGroups={csvGroups} size="sm" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Rage Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{totalRage}</span>
              <Badge variant="secondary">
                <TrendingUp className="w-4 h-4" />
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total JS Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{totalErrors}</span>
              <Badge variant="destructive">
                <AlertTriangle className="w-4 h-4" />
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Time Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{hours}h</span>
              <Badge variant="outline">
                <BarChart2 className="w-4 h-4" />
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Combined Trends</CardTitle>
          <CardDescription>Rage incidents and JS errors over time</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No trend data available for the selected time range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={formatHourLabel}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(label) => `Hour: ${label}`}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'rage' ? 'Rage Incidents' : 'JS Errors',
                  ]}
                />
                <Legend
                  formatter={(value) => (value === 'rage' ? 'Rage Incidents' : 'JS Errors')}
                />
                <Line
                  type="monotone"
                  dataKey="rage"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name="rage"
                />
                <Line
                  type="monotone"
                  dataKey="errors"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name="errors"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Individual Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              Rage Incidents
            </CardTitle>
            <CardDescription>Hourly rage click detection</CardDescription>
          </CardHeader>
          <CardContent>
            {rageTrends.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No rage incidents detected
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={rageTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={formatHourLabel}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={(label) => `Hour: ${label}`} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              JavaScript Errors
            </CardTitle>
            <CardDescription>Hourly error occurrences</CardDescription>
          </CardHeader>
          <CardContent>
            {errorTrends.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No errors recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={errorTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={formatHourLabel}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={(label) => `Hour: ${label}`} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrendsDashboard;
