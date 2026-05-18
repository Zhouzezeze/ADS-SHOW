import React from 'react';

interface StatusFilterProps {
  activeStatus: string;
  setActiveStatus: (status: string) => void;
  counts: Record<string, number>;
}

const StatusFilter: React.FC<StatusFilterProps> = ({ activeStatus, setActiveStatus, counts }) => {
  const statuses = [
    { id: '全部', label: '正常' },
    { id: '无转化', label: '无转化' },
    { id: '转化率偏低', label: '转化率偏低' },
    { id: 'ROAS偏低', label: 'ROAS偏低' },
    { id: '点击率偏低', label: '点击率偏低' },
    { id: '成本异常', label: '成本异常' },
  ];

  const getStatusColor = (id: string) => {
    if (id === '全部') return 'text-green-600 bg-green-50 border-green-200';
    return 'text-orange-600 bg-orange-50 border-orange-200';
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {statuses.map((status) => (
        <button
          key={status.id}
          onClick={() => setActiveStatus(status.id)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            activeStatus === status.id
              ? `${getStatusColor(status.id)} ring-2 ring-offset-1 ring-blue-500`
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          {status.label} <span className="ml-1 opacity-70">{counts[status.id] || 0}</span>
        </button>
      ))}
    </div>
  );
};

export default StatusFilter;
