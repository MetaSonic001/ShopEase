import React from 'react';

export type DateRangePreset = '24h' | '7d' | '30d';

export interface FilterValues {
  dateRange: DateRangePreset;
  device?: 'all' | 'desktop' | 'tablet' | 'mobile';
  page?: string;
  cohort?: string;
  variant?: string;
}

interface FilterBarProps {
  value: FilterValues;
  pages?: string[];
  loading?: boolean;
  onChange: (next: FilterValues) => void;
  onApply?: () => void;
  onReset?: () => void;
  endAdornment?: React.ReactNode; // e.g., Refresh/Export buttons
}

const FilterBar: React.FC<FilterBarProps> = ({ value, pages = [], loading, onChange, onApply, onReset, endAdornment }) => {
  const set = (patch: Partial<FilterValues>) => onChange({ ...value, ...patch });

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Date Range */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Time Range:</span>
        </div>
        <div className="flex gap-2">
          {(['24h','7d','30d'] as DateRangePreset[]).map((range) => (
            <button
              key={range}
              onClick={() => set({ dateRange: range })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${value.dateRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
          ))}
        </div>

        {/* Device */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Device:</span>
          <select
            value={value.device || 'all'}
            onChange={(e) => set({ device: e.target.value as any })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="desktop">Desktop</option>
            <option value="tablet">Tablet</option>
            <option value="mobile">Mobile</option>
          </select>
        </div>

        {/* Page */}
        <div className="flex items-center gap-2 min-w-[240px]">
          <span className="text-sm font-medium text-gray-700">Page:</span>
          <select
            value={value.page || 'all'}
            onChange={(e) => set({ page: e.target.value === 'all' ? undefined : e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Pages</option>
            {pages.slice(0, 100).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Cohort / Variant (optional) */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Cohort:</span>
          <input
            placeholder="e.g. beta-testers"
            value={value.cohort || ''}
            onChange={(e) => set({ cohort: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Variant:</span>
          <input
            placeholder="e.g. A/B"
            value={value.variant || ''}
            onChange={(e) => set({ variant: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {onReset && (
            <button
              onClick={onReset}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Reset
            </button>
          )}
          {onApply && (
            <button
              onClick={onApply}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              Apply
            </button>
          )}
          {endAdornment}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
