import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Shield, Plus, Trash2, Edit, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface ConsentRule {
  _id: string;
  name: string;
  type: 'mask' | 'block';
  selectors: string[];
  isActive: boolean;
  priority: number;
  description?: string;
  createdAt: string;
}

const ConsentMaskingManager: React.FC = () => {
  const [rules, setRules] = useState<ConsentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ConsentRule | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'mask' as 'mask' | 'block',
    selectors: '',
    isActive: true,
    priority: 0,
    description: '',
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/consent/rules');
      setRules(res.data);
    } catch (err) {
      console.error('Failed to fetch rules', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      selectors: formData.selectors.split('\n').filter(s => s.trim()),
    };

    try {
      if (editingRule) {
        await api.put(`/api/consent/rules/${editingRule._id}`, payload);
      } else {
        await api.post('/api/consent/rules', payload);
      }
      
      setDialogOpen(false);
      resetForm();
      fetchRules();
    } catch (err: any) {
      alert('Failed to save rule: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    
    try {
      await api.delete(`/api/consent/rules/${id}`);
      fetchRules();
    } catch (err: any) {
      alert('Failed to delete: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = (rule: ConsentRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      type: rule.type,
      selectors: rule.selectors.join('\n'),
      isActive: rule.isActive,
      priority: rule.priority,
      description: rule.description || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'mask',
      selectors: '',
      isActive: true,
      priority: 0,
      description: '',
    });
    setEditingRule(null);
  };

  const handleToggleActive = async (rule: ConsentRule) => {
    try {
      await api.put(`/api/consent/rules/${rule._id}`, {
        ...rule,
        isActive: !rule.isActive,
      });
      fetchRules();
    } catch (err: any) {
      alert('Failed to toggle: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <span>Consent & Masking Rules</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Protect user privacy by masking or blocking sensitive elements from session recordings
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingRule ? 'Edit Rule' : 'Create New Rule'}</DialogTitle>
                  <DialogDescription>
                    Define CSS selectors to mask or block from session recordings.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="col-span-3"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="type" className="text-right">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(val: 'mask' | 'block') => setFormData({ ...formData, type: val })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mask">Mask (blur/hide content)</SelectItem>
                        <SelectItem value="block">Block (exclude from recording)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="selectors" className="text-right pt-2">Selectors</Label>
                    <Textarea
                      id="selectors"
                      value={formData.selectors}
                      onChange={(e) => setFormData({ ...formData, selectors: e.target.value })}
                      className="col-span-3 font-mono text-sm"
                      rows={6}
                      placeholder={'input[type="password"]\ninput[name*="credit"]\n.sensitive-data'}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="priority" className="text-right">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="col-span-3"
                      placeholder="Optional description"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isActive" className="text-right">Active</Label>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {editingRule ? 'Update' : 'Create'} Rule
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-semibold mb-1">Privacy Protection</p>
                <p>
                  <strong>Mask</strong> rules blur/hide element content (e.g., passwords, credit cards).
                  <strong className="ml-2">Block</strong> rules completely exclude elements from recordings (e.g., admin panels).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rules List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Rules ({rules.length})</CardTitle>
            <CardDescription>
              Manage data protection rules applied to session recordings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading rules...</div>
            ) : rules.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No rules configured yet. Create your first rule to protect sensitive data.</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div
                      key={rule._id}
                      className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-lg">{rule.name}</h3>
                            <Badge variant={rule.type === 'mask' ? 'default' : 'destructive'}>
                              {rule.type === 'mask' ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                              {rule.type.toUpperCase()}
                            </Badge>
                            <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {rule.priority > 0 && (
                              <Badge variant="outline">Priority: {rule.priority}</Badge>
                            )}
                          </div>
                          
                          {rule.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {rule.description}
                            </p>
                          )}
                          
                          <div className="bg-gray-100 dark:bg-gray-900 rounded p-2 mt-2">
                            <p className="text-xs text-gray-500 mb-1">Selectors:</p>
                            <div className="flex flex-wrap gap-2">
                              {rule.selectors.map((sel, idx) => (
                                <code
                                  key={idx}
                                  className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border"
                                >
                                  {sel}
                                </code>
                              ))}
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-500 mt-2">
                            Created: {new Date(rule.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(rule)}
                          >
                            {rule.isActive ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(rule)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(rule._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsentMaskingManager;
