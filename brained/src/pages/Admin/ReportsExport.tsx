import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Calendar, FileSpreadsheet } from 'lucide-react';
import api from '@/services/api';

const saveBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
};

const ReportsExport: React.FC = () => {
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [pageURL, setPageURL] = useState<string>('');
  const [type, setType] = useState<'all' | 'events' | 'performance'>('all');
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const params = useMemo(() => {
    const p: any = {};
    if (from) p.from = from;
    if (to) p.to = to;
    if (pageURL) p.pageURL = pageURL;
    if (type) p.type = type;
    return p;
  }, [from, to, pageURL, type]);

  const downloadCsv = async () => {
    try {
      setLoadingCsv(true);
      const response = await api.get('/api/analytics/export/csv', {
        params,
        responseType: 'blob',
      });
      saveBlob(response.data, `analytics_${type}.csv`);
    } catch (e: any) {
      alert('Failed to download CSV: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoadingCsv(false);
    }
  };

  const downloadPdf = async () => {
    try {
      setLoadingPdf(true);
      const response = await api.get('/api/analytics/export/pdf', {
        params: { from, to, pageURL },
        responseType: 'blob',
      });
      saveBlob(response.data, 'analytics-report.pdf');
    } catch (e: any) {
      alert('Failed to download PDF: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle>Reports & Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="from" className="flex items-center gap-2"><Calendar className="w-4 h-4"/> From</Label>
              <Input id="from" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to" className="flex items-center gap-2"><Calendar className="w-4 h-4"/> To</Label>
              <Input id="to" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page">Page URL (optional)</Label>
              <Input id="page" placeholder="/checkout or https://..." value={pageURL} onChange={(e) => setPageURL(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <Label>CSV content</Label>
              <select
                className="border rounded px-3 py-2 bg-white dark:bg-gray-900"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
              >
                <option value="all">Events + Performance</option>
                <option value="events">Events only</option>
                <option value="performance">Performance only</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button onClick={downloadCsv} disabled={loadingCsv} className="flex-1">
                <FileSpreadsheet className="w-4 h-4 mr-2"/>
                {loadingCsv ? 'Preparing CSV…' : 'Download CSV'}
              </Button>
              <Button variant="secondary" onClick={downloadPdf} disabled={loadingPdf} className="flex-1">
                <FileText className="w-4 h-4 mr-2"/>
                {loadingPdf ? 'Rendering PDF…' : 'Download PDF Report'}
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Tip: The PDF report includes a cover, summary, events-by-type chart, recent events, performance summary, and top JS errors.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsExport;
