import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  suffix?: string;
  prefix?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, suffix = '', prefix = '' }) => {
  const isPositive = change >= 0;
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="text-sm font-medium text-gray-500 mb-2">{title}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-gray-900">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </div>
        <div className={`flex items-center text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

export default StatCard;
