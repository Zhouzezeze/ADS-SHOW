import React from 'react';
import type { ProductStatus } from '../types';

interface StatusFilterProps {
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  counts: Record<string, number>;
}

const StatusFilter: React.FC<StatusFilterProps> = ({ selectedStatus, onStatusChange, counts }) => {
  const statuses: { label: string; value: string; color: string }[] = [
    { label: '全部', value: 'all', color: 'bg-gray-100 text-gray-700' },
    { label: '正常', value: '正常', color: 'bg-green-100 text-green-700' },
    { label: '无转化', value: '无转化', color: 'bg-red-100 text-red-700' },
    { label: '转化率偏低', value: '转化率偏低', color: 'bg-orange-100 text-orange-700' },
    { label: 'ROAS偏低', value: 'ROAS偏低', color: 'bg-orange-100 text-orange-700' },
    { label: '点击率偏低', value: '点击率偏低', color: 'bg-yellow-100 text-yellow-700' },
    { label: '成本异常', value: '成本异常', color: 'bg-red-100 text-red-700' },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {statuses.map((s) => (
        <button
          key={s.value}
          onClick={() => onStatusChange(s.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border-2 ${
            selectedStatus === s.value 
              ? 'border-blue-500 ring-2 ring-blue-100' 
              : 'border-transparent hover:bg-white hover:shadow-sm'
          } ${s.color}`}
        >
          {s.label}
          <span className="bg-white bg-opacity-50 px-1.5 rounded text-xs">
            {s.value === 'all' ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[s.value] || 0)}
          </span>
        </button>
      ))}
    </div>
  );
};

export default StatusFilter;
