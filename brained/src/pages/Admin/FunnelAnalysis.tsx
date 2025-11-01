import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Calendar,
  Users,
  BarChart3,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface FunnelStep {
  name: string;
  eventType: string;
  pageURL?: string;
  elementSelector?: string;
}

interface Funnel {
  _id: string;
  name: string;
  description?: string;
  steps: FunnelStep[];
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface FunnelAnalysisData {
  stepName: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
  avgTimeToNext?: number;
}

const FunnelAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [analysisData, setAnalysisData] = useState<FunnelAnalysisData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dateRange, setDateRange] = useState('7d');
  
  // Create funnel form state
  const [newFunnel, setNewFunnel] = useState({
    name: '',
    description: '',
    steps: [
      { name: 'Step 1', eventType: 'pageview', pageURL: '', elementSelector: '' },
    ],
  });

  useEffect(() => {
    fetchFunnels();
  }, []);

  useEffect(() => {
    if (selectedFunnel) {
      analyzeFunnel(selectedFunnel._id);
    }
  }, [selectedFunnel, dateRange]);

  const fetchFunnels = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/funnels`, {
        withCredentials: true,
      });
      setFunnels(response.data.funnels || []);
      if (response.data.funnels && response.data.funnels.length > 0) {
        setSelectedFunnel(response.data.funnels[0]);
      }
    } catch (err) {
      console.error('Failed to fetch funnels', err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeFunnel = async (funnelId: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/funnels/${funnelId}/analyze?dateRange=${dateRange}`,
        { withCredentials: true }
      );
      setAnalysisData(response.data.analysis || []);
    } catch (err) {
      console.error('Failed to analyze funnel', err);
    }
  };

  const createFunnel = async () => {
    try {
      await axios.post(
        `${API_URL}/api/funnels`,
        { ...newFunnel, projectId: 'default' },
        { withCredentials: true }
      );
      setShowCreateModal(false);
      setNewFunnel({
        name: '',
        description: '',
        steps: [{ name: 'Step 1', eventType: 'pageview', pageURL: '', elementSelector: '' }],
      });
      fetchFunnels();
    } catch (err) {
      console.error('Failed to create funnel', err);
    }
  };

  const deleteFunnel = async (funnelId: string) => {
    if (!confirm('Are you sure you want to delete this funnel?')) return;
    try {
      await axios.delete(`${API_URL}/api/funnels/${funnelId}`, {
        withCredentials: true,
      });
      fetchFunnels();
    } catch (err) {
      console.error('Failed to delete funnel', err);
    }
  };

  const addStep = () => {
    setNewFunnel({
      ...newFunnel,
      steps: [
        ...newFunnel.steps,
        { name: `Step ${newFunnel.steps.length + 1}`, eventType: 'pageview', pageURL: '', elementSelector: '' },
      ],
    });
  };

  const removeStep = (index: number) => {
    setNewFunnel({
      ...newFunnel,
      steps: newFunnel.steps.filter((_, i) => i !== index),
    });
  };

  const updateStep = (index: number, field: string, value: string) => {
    const updatedSteps = [...newFunnel.steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setNewFunnel({ ...newFunnel, steps: updatedSteps });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getTotalConversionRate = () => {
    if (analysisData.length === 0) return 0;
    const firstStep = analysisData[0].users;
    const lastStep = analysisData[analysisData.length - 1].users;
    return firstStep > 0 ? ((lastStep / firstStep) * 100).toFixed(1) : 0;
  };

  const getBarColor = (conversionRate: number) => {
    if (conversionRate >= 70) return '#10b981'; // green
    if (conversionRate >= 40) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Funnel Analysis</h1>
            <p className="text-lg text-gray-600">
              Track user journey through conversion funnels
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Funnel
          </button>
        </div>
      </div>

      {/* Funnel Selector */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={selectedFunnel?._id || ''}
            onChange={(e) => {
              const funnel = funnels.find((f) => f._id === e.target.value);
              setSelectedFunnel(funnel || null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {funnels.map((funnel) => (
              <option key={funnel._id} value={funnel._id}>
                {funnel.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        <button
          onClick={() => selectedFunnel && analyzeFunnel(selectedFunnel._id)}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>

        {selectedFunnel && (
          <button
            onClick={() => deleteFunnel(selectedFunnel._id)}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            Delete Funnel
          </button>
        )}
      </div>

      {!selectedFunnel && funnels.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Funnels Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first funnel to start tracking user conversion paths
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First Funnel
          </button>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Total Entries</p>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {analysisData.length > 0 ? formatNumber(analysisData[0].users) : 0}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {analysisData.length > 0
                  ? formatNumber(analysisData[analysisData.length - 1].users)
                  : 0}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{getTotalConversionRate()}%</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Total Dropoff</p>
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {analysisData.length > 0
                  ? formatNumber(
                      analysisData[0].users - analysisData[analysisData.length - 1].users
                    )
                  : 0}
              </p>
            </div>
          </div>

          {/* Funnel Visualization */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Funnel Steps</h2>
            <div className="space-y-4">
              {analysisData.map((step, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{step.stepName}</h3>
                        <p className="text-sm text-gray-500">
                          {formatNumber(step.users)} users
                          {step.avgTimeToNext && index < analysisData.length - 1 && (
                            <span className="ml-2">
                              • Avg time: {formatTime(step.avgTimeToNext)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {step.conversionRate.toFixed(1)}%
                      </p>
                      {step.dropoffRate > 0 && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <TrendingDown className="w-4 h-4" />
                          {step.dropoffRate.toFixed(1)}% dropoff
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-4 rounded-full transition-all duration-500"
                      style={{
                        width: `${step.conversionRate}%`,
                        backgroundColor: getBarColor(step.conversionRate),
                      }}
                    ></div>
                  </div>
                  {index < analysisData.length - 1 && (
                    <div className="flex justify-center my-2">
                      <ArrowRight className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Step Comparison</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={analysisData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="stepName" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="users" radius={[8, 8, 0, 0]}>
                  {analysisData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.conversionRate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Create Funnel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create New Funnel</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funnel Name *
                </label>
                <input
                  type="text"
                  value={newFunnel.name}
                  onChange={(e) => setNewFunnel({ ...newFunnel, name: e.target.value })}
                  placeholder="e.g., Checkout Flow"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newFunnel.description}
                  onChange={(e) => setNewFunnel({ ...newFunnel, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Funnel Steps *
                  </label>
                  <button
                    onClick={addStep}
                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Step
                  </button>
                </div>
                <div className="space-y-4">
                  {newFunnel.steps.map((step, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Step {index + 1}</h4>
                        {newFunnel.steps.length > 1 && (
                          <button
                            onClick={() => removeStep(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => updateStep(index, 'name', e.target.value)}
                          placeholder="Step name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <select
                          value={step.eventType}
                          onChange={(e) => updateStep(index, 'eventType', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="pageview">Page View</option>
                          <option value="click">Click</option>
                          <option value="submit">Form Submit</option>
                          <option value="custom">Custom Event</option>
                        </select>
                        {step.eventType === 'pageview' && (
                          <input
                            type="text"
                            value={step.pageURL || ''}
                            onChange={(e) => updateStep(index, 'pageURL', e.target.value)}
                            placeholder="Page URL (e.g., /checkout)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        )}
                        {(step.eventType === 'click' || step.eventType === 'submit') && (
                          <input
                            type="text"
                            value={step.elementSelector || ''}
                            onChange={(e) => updateStep(index, 'elementSelector', e.target.value)}
                            placeholder="Element selector (e.g., .add-to-cart)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createFunnel}
                disabled={!newFunnel.name || newFunnel.steps.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Funnel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FunnelAnalysis;
