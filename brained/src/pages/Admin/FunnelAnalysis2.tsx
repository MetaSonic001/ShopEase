"use client"

import { useState, useMemo } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  TrendingDown,
  TrendingUp,
  Plus,
  Filter,
  Calendar,
  Users,
  RefreshCw,
  Download,
  ArrowDownRight,
  Clock,
  Zap,
  Target,
  X,
  AlertTriangle,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const MOCK_FUNNELS = [
  {
    _id: "1",
    name: "Checkout Flow",
    description: "Primary purchase flow",
    steps: [
      { name: "Product View", eventType: "pageview" },
      { name: "Add to Cart", eventType: "click" },
      { name: "Checkout Start", eventType: "pageview" },
      { name: "Payment Info", eventType: "pageview" },
      { name: "Order Complete", eventType: "pageview" },
    ],
  },
  {
    _id: "2",
    name: "Cart Recovery",
    description: "Abandoned cart recovery flow",
    steps: [
      { name: "Cart View", eventType: "pageview" },
      { name: "Checkout Started", eventType: "pageview" },
      { name: "Checkout Abandoned", eventType: "custom" },
      { name: "Recovery Email Click", eventType: "click" },
      { name: "Recovered Purchase", eventType: "custom" },
    ],
  },
]

const MOCK_ANALYSIS = [
  { stepName: "Product View", users: 10000, conversionRate: 100, dropoffRate: 0, avgTimeToNext: 45 },
  { stepName: "Add to Cart", users: 3200, conversionRate: 32, dropoffRate: 68, avgTimeToNext: 120 },
  { stepName: "Checkout Start", users: 2100, conversionRate: 21, dropoffRate: 34, avgTimeToNext: 180 },
  { stepName: "Payment Info", users: 1680, conversionRate: 16.8, dropoffRate: 20, avgTimeToNext: 90 },
  { stepName: "Order Complete", users: 1512, conversionRate: 15.12, dropoffRate: 10, avgTimeToNext: 0 },
]

interface FunnelStep {
  name: string
  eventType: string
  pageURL?: string
  elementSelector?: string
}

interface Funnel {
  _id: string
  name: string
  description?: string
  steps: FunnelStep[]
}

interface FunnelAnalysisData {
  stepName: string
  users: number
  conversionRate: number
  dropoffRate: number
  avgTimeToNext?: number
}

const FunnelAnalysis2 = () => {
  const [funnels, setFunnels] = useState<Funnel[]>(MOCK_FUNNELS)
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel>(MOCK_FUNNELS[0])
  const [analysisData, setAnalysisData] = useState<FunnelAnalysisData[]>(MOCK_ANALYSIS)
  const [dateRange, setDateRange] = useState("7d")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFunnelName, setNewFunnelName] = useState("")
  const [newFunnelDescription, setNewFunnelDescription] = useState("")
  const [newFunnelSteps, setNewFunnelSteps] = useState<FunnelStep[]>([])
  const [stepName, setStepName] = useState("")
  const [stepEventType, setStepEventType] = useState("pageview")

  const metrics = useMemo(() => {
    if (analysisData.length === 0) return { entries: 0, completed: 0, rate: 0, dropoff: 0 }
    const entries = analysisData[0].users
    const completed = analysisData[analysisData.length - 1].users
    const rate = entries > 0 ? ((completed / entries) * 100).toFixed(1) : 0
    const dropoff = entries - completed
    return { entries, completed, rate, dropoff }
  }, [analysisData])

  const segmentData = useMemo(() => {
    return [
      { segment: "Desktop", conversion: 18.5, users: 6200, dropoff: 81.5 },
      { segment: "Mobile", conversion: 12.3, users: 3300, dropoff: 87.7 },
      { segment: "Tablet", conversion: 15.8, users: 500, dropoff: 84.2 },
    ]
  }, [])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  const getBarColor = (conversionRate: number) => {
    if (conversionRate >= 70) return "#10b981"
    if (conversionRate >= 40) return "#3b82f6"
    return "#ef4444"
  }

  const handleAddStep = () => {
    if (stepName.trim()) {
      setNewFunnelSteps([...newFunnelSteps, { name: stepName, eventType: stepEventType }])
      setStepName("")
      setStepEventType("pageview")
    }
  }

  const handleRemoveStep = (index: number) => {
    setNewFunnelSteps(newFunnelSteps.filter((_, i) => i !== index))
  }

  const handleCreateFunnel = () => {
    if (newFunnelName.trim() && newFunnelSteps.length > 0) {
      const newFunnel: Funnel = {
        _id: String(funnels.length + 1),
        name: newFunnelName,
        description: newFunnelDescription,
        steps: newFunnelSteps,
      }
      setFunnels([...funnels, newFunnel])
      setShowCreateModal(false)
      setNewFunnelName("")
      setNewFunnelDescription("")
      setNewFunnelSteps([])
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setNewFunnelName("")
    setNewFunnelDescription("")
    setNewFunnelSteps([])
    setStepName("")
    setStepEventType("pageview")
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Funnel Analysis</h1>
              <p className="text-sm text-muted-foreground mt-1">Track user journey through conversion funnels</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Funnel
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedFunnel?._id}
                onChange={(e) => {
                  const funnel = funnels.find((f) => f._id === e.target.value)
                  if (funnel) setSelectedFunnel(funnel)
                }}
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
              >
                {funnels.map((funnel) => (
                  <option key={funnel._id} value={funnel._id}>
                    {funnel.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>

            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>

            <Button variant="outline" size="sm" className="gap-2 ml-auto bg-transparent">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Entries</p>
                <p className="text-3xl font-bold text-foreground mt-2">{formatNumber(metrics.entries)}</p>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Users who started the funnel</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</p>
                <p className="text-3xl font-bold text-foreground mt-2">{formatNumber(metrics.completed)}</p>
              </div>
              <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Successful conversions</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversion Rate</p>
                <p className="text-3xl font-bold text-foreground mt-2">{metrics.rate}%</p>
              </div>
              <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Overall funnel conversion</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Dropoff</p>
                <p className="text-3xl font-bold text-foreground mt-2">{formatNumber(metrics.dropoff)}</p>
              </div>
              <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Users who left the funnel</p>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Funnel Steps */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-6">Funnel Steps</h2>
              <div className="space-y-4">
                {analysisData.map((step, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{step.stepName}</h3>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(step.users)} users
                            {step.avgTimeToNext && index < analysisData.length - 1 && (
                              <span className="ml-3">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {formatTime(step.avgTimeToNext)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">{step.conversionRate.toFixed(1)}%</p>
                        {step.dropoffRate > 0 && (
                          <div className="flex items-center justify-end gap-1 text-xs text-red-600 dark:text-red-400 mt-1">
                            <ArrowDownRight className="w-3 h-3" />
                            {step.dropoffRate.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${step.conversionRate}%`,
                          backgroundColor: getBarColor(step.conversionRate),
                        }}
                      />
                    </div>
                    {index < analysisData.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowDownRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Insights Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Top Insights</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-red-900 dark:text-red-100">Largest Dropoff</p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      68% drop between Product View & Add to Cart
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">Strong Performance</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">10% recovery from abandoned carts</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Average Time in Step</h3>
              <div className="space-y-3">
                {analysisData.slice(0, 3).map((step, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{step.stepName}</span>
                    <span className="font-medium text-foreground">
                      {step.avgTimeToNext ? formatTime(step.avgTimeToNext) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Users per Step */}
          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-6">Users Per Step</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysisData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="stepName" stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} />
                <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "var(--color-foreground)" }}
                />
                <Bar dataKey="users" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Conversion Rate Trend */}
          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-6">Conversion Rate</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analysisData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="stepName" stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} />
                <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "var(--color-foreground)" }}
                />
                <Line
                  type="monotone"
                  dataKey="conversionRate"
                  stroke="var(--color-chart-1)"
                  dot={{ fill: "var(--color-primary)" }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Segment Comparison */}
        <Card className="p-6 mt-6">
          <h3 className="font-semibold text-foreground mb-6">Segment Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {segmentData.map((segment, index) => (
              <div key={index} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{segment.segment}</span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">{segment.conversion}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                    style={{ width: `${segment.conversion}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Users: {formatNumber(segment.users)}</p>
                  <p>Dropoff: {segment.dropoff.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 mt-6">
          <h3 className="font-semibold text-foreground mb-4">{selectedFunnel.name} - Steps Configuration</h3>
          <div className="space-y-3">
            {selectedFunnel.steps.map((step, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{step.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Event Type: <span className="font-mono">{step.eventType}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Create New Funnel</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Funnel Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Checkout Flow"
                  value={newFunnelName}
                  onChange={(e) => setNewFunnelName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  placeholder="Optional description"
                  rows={3}
                  value={newFunnelDescription}
                  onChange={(e) => setNewFunnelDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-4">Funnel Steps *</label>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Step name (e.g., Product View)"
                        value={stepName}
                        onChange={(e) => setStepName(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <select
                      value={stepEventType}
                      onChange={(e) => setStepEventType(e.target.value)}
                      className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="pageview">Pageview</option>
                      <option value="click">Click</option>
                      <option value="custom">Custom</option>
                    </select>
                    <Button onClick={handleAddStep} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Step
                    </Button>
                  </div>

                  {newFunnelSteps.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {newFunnelSteps.map((step, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{step.name}</p>
                              <p className="text-xs text-muted-foreground">{step.eventType}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveStep(index)}
                            className="p-2 hover:bg-background rounded-md transition-colors"
                          >
                            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button onClick={handleCreateFunnel} disabled={!newFunnelName.trim() || newFunnelSteps.length === 0}>
                Create Funnel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </main>
  )
}

export default FunnelAnalysis2
