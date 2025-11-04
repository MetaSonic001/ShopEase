import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

interface Flag {
  _id: string;
  name: string;
  key: string;
  description?: string;
  enabled: boolean;
  value: any;
  projectId?: string;
  createdAt: string;
}

export default function FeatureFlags() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', key: '', description: '', enabled: true, value: 'true' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/analytics/flags`);
      setFlags(res.data.flags || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createFlag = async () => {
    const payload = {
      name: form.name,
      key: form.key,
      description: form.description,
      enabled: form.enabled,
      value: form.value === 'true' ? true : form.value === 'false' ? false : form.value,
    };
    await axios.post(`${API_BASE}/api/analytics/flags`, payload);
    setOpen(false);
    setForm({ name: '', key: '', description: '', enabled: true, value: 'true' });
    load();
  };

  const toggle = async (id: string, enabled: boolean) => {
    await axios.patch(`${API_BASE}/api/analytics/flags/${id}`, { enabled });
    load();
  };

  const remove = async (id: string) => {
    await axios.delete(`${API_BASE}/api/analytics/flags/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Feature Flags</h1>
        <Button onClick={() => setOpen(true)}>Create Flag</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flags {loading && <span className="text-sm text-muted-foreground">(loading...)</span>}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No flags yet</TableCell>
                </TableRow>
              )}
              {flags.map(flag => (
                <TableRow key={flag._id}>
                  <TableCell className="font-medium">{flag.name}</TableCell>
                  <TableCell className="font-mono">{flag.key}</TableCell>
                  <TableCell>
                    {typeof flag.value === 'boolean' ? (
                      <Badge variant={flag.value ? 'default' : 'secondary'}>{String(flag.value)}</Badge>
                    ) : (
                      <span className="font-mono text-sm">{JSON.stringify(flag.value)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={flag.enabled} onCheckedChange={(v: boolean) => toggle(flag._id, v)} />
                      <span className="text-sm text-muted-foreground">{flag.enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(flag.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" size="sm" onClick={() => remove(flag._id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create feature flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Name</label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm">Key</label>
              <Input value={form.key} onChange={(e) => setForm(f => ({ ...f, key: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm">Description</label>
              <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm">Value (true/false or string)</label>
              <Input value={form.value} onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={(v: boolean) => setForm(f => ({ ...f, enabled: v }))} />
              <span className="text-sm text-muted-foreground">Enabled</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={createFlag} disabled={!form.name || !form.key}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
