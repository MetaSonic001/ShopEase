import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FlaskConical,
  Plus,
  Trash2,
  Filter,
  Calendar,
  TrendingUp,
  Play,
  Pause,
  Trophy,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

const API_URL = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

interface Variant {
  name: string;
  weight: number;
  description?: string;
}

interface Experiment {
  _id: string;
  name: string;
  description?: string;
  variants: Variant[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  targetMetric: string;
  projectId: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface VariantResult {
  name: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
  isWinner: boolean;
}

const ABTesting: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [results, setResults] = useState<VariantResult[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Create experiment form state
  const [newExperiment, setNewExperiment] = useState({
    name: '',
    description: '',
    targetMetric: 'conversion',
    variants: [
      { name: 'Control', weight: 50, description: 'Original version' },
      { name: 'Variant A', weight: 50, description: 'Test version' },
    ],
  });

  useEffect(() => {
    fetchExperiments();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedExperiment) {
      analyzeExperiment(selectedExperiment._id);
    }
  }, [selectedExperiment]);

  const fetchExperiments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/api/experiments${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`,
        { withCredentials: true }
      );
      setExperiments(response.data.experiments || []);
      if (response.data.experiments && response.data.experiments.length > 0) {
        setSelectedExperiment(response.data.experiments[0]);
      }
    } catch (err) {
      console.error('Failed to fetch experiments', err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeExperiment = async (experimentId: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/experiments/${experimentId}/analyze`, {
        withCredentials: true,
      });
      setResults(response.data.results || []);
      setTrendData(response.data.trends || []);
    } catch (err) {
      console.error('Failed to analyze experiment', err);
    }
  };

  const createExperiment = async () => {
    try {
      await axios.post(
        `${API_URL}/api/experiments`,
        { ...newExperiment, projectId: 'default', status: 'draft' },
        { withCredentials: true }
      );
      setShowCreateModal(false);
      setNewExperiment({
        name: '',
        description: '',
        targetMetric: 'conversion',
        variants: [
          { name: 'Control', weight: 50, description: 'Original version' },
          { name: 'Variant A', weight: 50, description: 'Test version' },
        ],
      });
      fetchExperiments();
    } catch (err) {
      console.error('Failed to create experiment', err);
    }
  };

  const updateExperimentStatus = async (experimentId: string, status: string) => {
    try {
      await axios.patch(
        `${API_URL}/api/experiments/${experimentId}`,
        { status },
        { withCredentials: true }
      );
      fetchExperiments();
    } catch (err) {
      console.error('Failed to update experiment status', err);
    }
  };

  const deleteExperiment = async (experimentId: string) => {
    if (!confirm('Are you sure you want to delete this experiment?')) return;
    try {
      await axios.delete(`${API_URL}/api/experiments/${experimentId}`, {
        withCredentials: true,
      });
      fetchExperiments();
    } catch (err) {
      console.error('Failed to delete experiment', err);
    }
  };

  const addVariant = () => {
    setNewExperiment({
      ...newExperiment,
      variants: [
        ...newExperiment.variants,
        { name: `Variant ${String.fromCharCode(65 + newExperiment.variants.length - 1)}`, weight: 0, description: '' },
      ],
    });
    redistributeWeights();
  };

  const removeVariant = (index: number) => {
    if (newExperiment.variants.length <= 2) return;
    setNewExperiment({
      ...newExperiment,
      variants: newExperiment.variants.filter((_, i) => i !== index),
    });
    redistributeWeights();
  };

  const updateVariant = (index: number, field: string, value: string | number) => {
    const updatedVariants = [...newExperiment.variants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    setNewExperiment({ ...newExperiment, variants: updatedVariants });
  };

  const redistributeWeights = () => {
    const count = newExperiment.variants.length;
    const weight = Math.floor(100 / count);
    const updatedVariants = newExperiment.variants.map((v, i) => ({
      ...v,
      weight: i === 0 ? 100 - weight * (count - 1) : weight,
    }));
    setNewExperiment({ ...newExperiment, variants: updatedVariants });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-green-600';
    if (confidence >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-lg text-slate-700">Loading experiments...</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 py-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">A/B Testing</h1>
            <p className="text-lg text-slate-600">
              Run experiments and optimize user experience
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Experiment
          </button>
        </div>
      </div>

      <div className="px-6 pb-6">

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-500" />
          <select
            value={selectedExperiment?._id || ''}
            onChange={(e) => {
              const experiment = experiments.find((exp) => exp._id === e.target.value);
              setSelectedExperiment(experiment || null);
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {experiments.map((experiment) => (
              <option key={experiment._id} value={experiment._id}>
                {experiment.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <button
          onClick={() => selectedExperiment && analyzeExperiment(selectedExperiment._id)}
          className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>

        {selectedExperiment && (
          <>
            {selectedExperiment.status === 'draft' && (
              <button
                onClick={() => updateExperimentStatus(selectedExperiment._id, 'running')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Experiment
              </button>
            )}
            {selectedExperiment.status === 'running' && (
              <button
                onClick={() => updateExperimentStatus(selectedExperiment._id, 'paused')}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            )}
            {selectedExperiment.status === 'paused' && (
              <button
                onClick={() => updateExperimentStatus(selectedExperiment._id, 'running')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            )}
            <button
              onClick={() => deleteExperiment(selectedExperiment._id)}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </>
        )}
      </div>

      {!selectedExperiment && experiments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FlaskConical className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Experiments Yet</h3>
          <p className="text-slate-600 mb-6">
            Create your first A/B test to optimize user experience
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First Experiment
          </button>
        </div>
      ) : (
        <>
          {/* Experiment Info Card */}
          {selectedExperiment && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-900">{selectedExperiment.name}</h2>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                        selectedExperiment.status
                      )}`}
                    >
                      {selectedExperiment.status.toUpperCase()}
                    </span>
                  </div>
                  {selectedExperiment.description && (
                    <p className="text-slate-600 mb-3">{selectedExperiment.description}</p>
                  )}
                  <p className="text-sm text-slate-500">
                    Target Metric: <span className="font-semibold">{selectedExperiment.targetMetric}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedExperiment.variants.map((variant, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {variant.name} ({variant.weight}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Variant Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {results.map((result, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl shadow-sm p-6 ${
                  result.isWinner ? 'border-2 border-green-500' : ''
                }`}
              >
                {result.isWinner && (
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <Trophy className="w-5 h-5" />
                    <span className="text-sm font-bold">WINNER</span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-slate-900 mb-4">{result.name}</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-600">Impressions</p>
                    <p className="text-2xl font-bold text-slate-900">{formatNumber(result.impressions)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Conversions</p>
                    <p className="text-2xl font-bold text-slate-900">{formatNumber(result.conversions)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Conversion Rate</p>
                    <p className="text-2xl font-bold text-slate-900">{result.conversionRate.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Statistical Confidence</p>
                    <p className={`text-2xl font-bold ${getConfidenceColor(result.confidence)}`}>
                      {result.confidence.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Bar Chart */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Conversion Rate Comparison</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={results}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="conversionRate" radius={[8, 8, 0, 0]}>
                  {results.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isWinner ? '#10b981' : COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Trend Chart */}
          {trendData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Performance Over Time</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  {results.map((result, index) => (
                    <Line
                      key={result.name}
                      type="monotone"
                      dataKey={result.name}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* Create Experiment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Create New Experiment</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Experiment Name *
                </label>
                <input
                  type="text"
                  value={newExperiment.name}
                  onChange={(e) => setNewExperiment({ ...newExperiment, name: e.target.value })}
                  placeholder="e.g., Homepage Button Color Test"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newExperiment.description}
                  onChange={(e) => setNewExperiment({ ...newExperiment, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Target Metric *
                </label>
                <select
                  value={newExperiment.targetMetric}
                  onChange={(e) => setNewExperiment({ ...newExperiment, targetMetric: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="conversion">Conversion Rate</option>
                  <option value="clicks">Click-Through Rate</option>
                  <option value="engagement">Engagement Time</option>
                  <option value="revenue">Revenue</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Variants * (min. 2)
                  </label>
                  <button
                    onClick={addVariant}
                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Variant
                  </button>
                </div>
                <div className="space-y-4">
                  {newExperiment.variants.map((variant, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-900">{variant.name}</h4>
                        {newExperiment.variants.length > 2 && (
                          <button
                            onClick={() => removeVariant(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) => updateVariant(index, 'name', e.target.value)}
                          placeholder="Variant name"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <input
                          type="number"
                          value={variant.weight}
                          onChange={(e) => updateVariant(index, 'weight', parseInt(e.target.value))}
                          placeholder="Traffic weight (%)"
                          min="0"
                          max="100"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <textarea
                          value={variant.description || ''}
                          onChange={(e) => updateVariant(index, 'description', e.target.value)}
                          placeholder="Variant description (optional)"
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Total weight: {newExperiment.variants.reduce((sum, v) => sum + v.weight, 0)}% (should be 100%)
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createExperiment}
                disabled={
                  !newExperiment.name ||
                  newExperiment.variants.length < 2 ||
                  newExperiment.variants.reduce((sum, v) => sum + v.weight, 0) !== 100
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Experiment
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
};

export default ABTesting;
