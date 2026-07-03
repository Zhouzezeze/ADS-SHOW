import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  suffix?: string;
  prefix?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, suffix = '', prefix = '' }) => {
  const isPositive = change !== undefined && change > 0;
  const displayValue = value !== undefined && value !== null ? value : '--';

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-gray-500 text-sm font-medium mb-2">{title}</h3>
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold text-gray-900">
          {prefix}{displayValue}{suffix}
        </div>
        {change !== undefined && (
          <div className={`flex items-center text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
