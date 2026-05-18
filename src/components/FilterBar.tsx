import React from 'react';
import { Search, ChevronDown, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  onSearch: (value: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ onSearch }) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="SKU / 产品名称"
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        <div className="relative">
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
            <span>全部店铺</span>
            <ChevronDown size={14} />
          </button>
        </div>

        <div className="relative">
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
            <span>全部平台</span>
            <ChevronDown size={14} />
          </button>
        </div>

        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button className="px-3 py-1.5 bg-white text-blue-600 font-bold rounded shadow-sm text-xs">最近7天</button>
          <button className="px-3 py-1.5 text-gray-500 text-xs">自定义</button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">仅亏损</span>
          <button className="w-10 h-5 bg-blue-600 rounded-full relative transition-colors">
            <span className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></span>
          </button>
          <span className="text-xs text-red-500 font-bold">4159</span>
        </div>

        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
          查询
        </button>
        
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
