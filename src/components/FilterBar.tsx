import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  onReset: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ 
  searchQuery, 
  onSearchChange, 
  dateRange, 
  onDateRangeChange, 
  onReset 
}) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4 mb-6">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索 SKU 或 商品名称..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>
      
      <select className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option>全部店铺</option>
        <option>Shop A</option>
        <option>Shop B</option>
      </select>
      
      <div className="flex bg-gray-100 p-1 rounded-lg">
        {['最近7天', '最近30天', '自定义'].map((range) => (
          <button
            key={range}
            onClick={() => onDateRangeChange(range)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              dateRange === range ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {range}
          </button>
        ))}
      </div>
      
      <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
        查询
      </button>
      
      <button 
        onClick={onReset}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 px-4 py-2 transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        重置
      </button>
    </div>
  );
};

export default FilterBar;
