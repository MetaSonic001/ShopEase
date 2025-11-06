import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Bell, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import ExportToolbar from '../../components/ExportToolbar';

interface AlertRule {
  _id: string;
  name: string;
  metric: string;
  comparator: string;
  threshold: number;
  windowMinutes: number;
  channel: string;
  slackWebhook?: string;
  webhookUrl?: string;
  isActive: boolean;
  cooldownMs: number;
  lastTriggeredAt?: Date;
}

const AlertRulesManager: React.FC = () => {
  const { toast } = useToast();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    metric: 'events_per_minute',
    comparator: '>',
    threshold: 100,
    windowMinutes: 5,
    channel: 'slack',
    slackWebhook: '',
    webhookUrl: '',
    isActive: true,
    cooldownMs: 300000, // 5 minutes
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/alerts/rules');
      setRules(response.data);
    } catch (error) {
      console.error('Failed to fetch alert rules:', error);
      toast({ variant: 'destructive', description: 'Failed to load alert rules' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await api.put(`/api/alerts/rules/${editingRule._id}`, formData);
        toast({ description: 'Alert rule updated' });
      } else {
        await api.post('/api/alerts/rules', formData);
        toast({ description: 'Alert rule created' });
      }
      setDialogOpen(false);
      resetForm();
      fetchRules();
    } catch (error) {
      console.error('Failed to save alert rule:', error);
      toast({ variant: 'destructive', description: 'Failed to save alert rule' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;
    try {
      await api.delete(`/api/alerts/rules/${id}`);
      toast({ description: 'Alert rule deleted' });
      fetchRules();
    } catch (error) {
      console.error('Failed to delete alert rule:', error);
      toast({ variant: 'destructive', description: 'Failed to delete alert rule' });
    }
  };

  const handleToggleActive = async (rule: AlertRule) => {
    try {
      await api.put(`/api/alerts/rules/${rule._id}`, { isActive: !rule.isActive });
      toast({ description: `Alert rule ${!rule.isActive ? 'activated' : 'deactivated'}` });
      fetchRules();
    } catch (error) {
      console.error('Failed to toggle alert rule:', error);
      toast({ variant: 'destructive', description: 'Failed to toggle alert rule' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      metric: 'events_per_minute',
      comparator: '>',
      threshold: 100,
      windowMinutes: 5,
      channel: 'slack',
      slackWebhook: '',
      webhookUrl: '',
      isActive: true,
      cooldownMs: 300000,
    });
    setEditingRule(null);
  };

  const openEditDialog = (rule: AlertRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      metric: rule.metric,
      comparator: rule.comparator,
      threshold: rule.threshold,
      windowMinutes: rule.windowMinutes,
      channel: rule.channel,
      slackWebhook: rule.slackWebhook || '',
      webhookUrl: rule.webhookUrl || '',
      isActive: rule.isActive,
      cooldownMs: rule.cooldownMs,
    });
    setDialogOpen(true);
  };

  const getMetricLabel = (metric: string) => {
    const labels: Record<string, string> = {
      events_per_minute: 'Events/Min',
      lcp_p75: 'LCP P75',
      cls_p75: 'CLS P75',
      inp_p75: 'INP P75',
      js_errors_per_minute: 'JS Errors/Min',
    };
    return labels[metric] || metric;
  };

  const getMetricBadgeVariant = (metric: string) => {
    if (metric.includes('error')) return 'destructive';
    if (metric.includes('lcp') || metric.includes('cls') || metric.includes('inp')) return 'secondary';
    return 'default';
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const csvGroups = rules.length ? [
    {
      label: 'Alert Rules',
      headers: ['id','name','metric','comparator','threshold','windowMinutes','channel','cooldownMs','isActive','lastTriggeredAt'],
      rows: rules.map(r => [r._id, r.name, r.metric, r.comparator, r.threshold, r.windowMinutes, r.channel, r.cooldownMs, r.isActive, r.lastTriggeredAt ? new Date(r.lastTriggeredAt).toISOString() : '']),
      filename: 'alert-rules.csv'
    }
  ] : [];

  return (
    <div ref={containerRef} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alert Rules</h1>
          <p className="text-muted-foreground mt-1">Configure alerts for metrics and performance thresholds</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportToolbar targetRef={containerRef as any} pdfFilename="alert-rules.pdf" csvGroups={csvGroups as any} size="sm" />
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Alert Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}</DialogTitle>
              <DialogDescription>Configure thresholds and notification channels</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Rule Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., High Error Rate Alert"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="metric">Metric</Label>
                  <Select value={formData.metric} onValueChange={(value) => setFormData({ ...formData, metric: value })}>
                    <SelectTrigger id="metric">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="events_per_minute">Events per Minute</SelectItem>
                      <SelectItem value="lcp_p75">LCP P75 (sec)</SelectItem>
                      <SelectItem value="cls_p75">CLS P75</SelectItem>
                      <SelectItem value="inp_p75">INP P75 (ms)</SelectItem>
                      <SelectItem value="js_errors_per_minute">JS Errors per Minute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="comparator">Comparator</Label>
                  <Select value={formData.comparator} onValueChange={(value) => setFormData({ ...formData, comparator: value })}>
                    <SelectTrigger id="comparator">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=">">Greater than (&gt;)</SelectItem>
                      <SelectItem value=">=">Greater or equal (&gt;=)</SelectItem>
                      <SelectItem value="<">Less than (&lt;)</SelectItem>
                      <SelectItem value="<=">Less or equal (&lt;=)</SelectItem>
                      <SelectItem value="==">Equal (==)</SelectItem>
                      <SelectItem value="!=">Not equal (!=)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="threshold">Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    step="0.1"
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="windowMinutes">Time Window (minutes)</Label>
                  <Input
                    id="windowMinutes"
                    type="number"
                    value={formData.windowMinutes}
                    onChange={(e) => setFormData({ ...formData, windowMinutes: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="channel">Channel</Label>
                  <Select value={formData.channel} onValueChange={(value) => setFormData({ ...formData, channel: value })}>
                    <SelectTrigger id="channel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="webhook">Generic Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cooldownMs">Cooldown (ms)</Label>
                  <Input
                    id="cooldownMs"
                    type="number"
                    value={formData.cooldownMs}
                    onChange={(e) => setFormData({ ...formData, cooldownMs: parseInt(e.target.value) })}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Minimum time between alerts (ms)</p>
                </div>

                {formData.channel === 'slack' && (
                  <div className="col-span-2">
                    <Label htmlFor="slackWebhook">Slack Webhook URL</Label>
                    <Input
                      id="slackWebhook"
                      type="url"
                      value={formData.slackWebhook}
                      onChange={(e) => setFormData({ ...formData, slackWebhook: e.target.value })}
                      placeholder="https://hooks.slack.com/services/..."
                      required={formData.channel === 'slack'}
                    />
                  </div>
                )}

                {formData.channel === 'webhook' && (
                  <div className="col-span-2">
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      type="url"
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                      placeholder="https://example.com/webhook"
                      required={formData.channel === 'webhook'}
                    />
                  </div>
                )}

                <div className="col-span-2 flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRule ? 'Update' : 'Create'} Rule
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading alert rules...
          </CardContent>
        </Card>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No alert rules configured</h3>
            <p className="text-muted-foreground mb-4">Create your first alert rule to monitor metrics</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Alert Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-250px)]">
          <div className="grid gap-4">
            {rules.map((rule) => (
              <Card key={rule._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {rule.name}
                        {rule.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        <Badge variant={getMetricBadgeVariant(rule.metric)}>
                          {getMetricLabel(rule.metric)}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Alert when {getMetricLabel(rule.metric)} {rule.comparator} {rule.threshold} over {rule.windowMinutes} min window
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={rule.isActive} onCheckedChange={() => handleToggleActive(rule)} />
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(rule)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(rule._id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Channel</p>
                      <p className="font-medium capitalize">{rule.channel}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cooldown</p>
                      <p className="font-medium">{(rule.cooldownMs / 60000).toFixed(0)} min</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Triggered</p>
                      <p className="font-medium">{rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).toLocaleString() : 'Never'}</p>
                    </div>
                  </div>
                  {rule.lastTriggeredAt && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 text-sm text-amber-800">
                      <AlertCircle className="w-4 h-4" />
                      Alert triggered recently - check your {rule.channel} channel
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default AlertRulesManager;
