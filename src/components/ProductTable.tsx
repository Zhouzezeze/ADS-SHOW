import React, { useState } from 'react';
import type { ProductData, ProductStatus } from '../types';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface ProductTableProps {
  products: ProductData[];
}

const ProductTable: React.FC<ProductTableProps> = ({ products }) => {
  const [sortKey, setSortKey] = useState<keyof ProductData>('sales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const handleSort = (key: keyof ProductData) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedProducts.length / pageSize);
  const currentProducts = sortedProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statusColors: Record<ProductStatus, string> = {
    '正常': 'bg-green-100 text-green-700',
    '无转化': 'bg-red-100 text-red-700',
    '转化率偏低': 'bg-orange-100 text-orange-700',
    'ROAS偏低': 'bg-orange-100 text-orange-700',
    '点击率偏低': 'bg-yellow-100 text-yellow-700',
    '成本异常': 'bg-red-100 text-red-700',
  };

  const SortIcon = ({ column }: { column: keyof ProductData }) => {
    if (sortKey !== column) return <div className="w-4 h-4 opacity-0 group-hover:opacity-30 flex flex-col items-center justify-center"><ChevronUp size={12} /><ChevronDown size={12} /></div>;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">诊断状态</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">商品信息</th>
              {([
                ['impressions', '曝光'], ['clicks', '点击'], ['ctr', 'CTR'], ['orders', '转化'], 
                ['cvr', 'CVR'], ['sales', '广告销售'], ['spend', '花费'], ['cpc', 'CPC'], ['roas', 'ROAS']
              ] as const).map(([key, label]) => (
                <th 
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-6 py-4 text-sm font-semibold text-gray-600 cursor-pointer group whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    {label}
                    <SortIcon column={key} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {currentProducts.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[p.status]}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                    <div>
                      <div className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{p.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{p.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{p.impressions.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{p.clicks.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{p.ctr.toFixed(2)}%</td>
                <td className="px-6 py-4 text-sm text-gray-700 font-medium">{p.orders}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{p.cvr.toFixed(2)}%</td>
                <td className="px-6 py-4 text-sm text-gray-900 font-bold">${p.sales.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-red-600 font-medium">${p.spend.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-gray-700">${p.cpc.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-blue-700 font-black">{p.roas.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          显示 {(currentPage - 1) * pageSize + 1} 到 {Math.min(currentPage * pageSize, products.length)} 条，共 {products.length} 条数据
        </div>
        <div className="flex gap-2">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-50 hover:bg-white"
          >
            上一页
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1.5 rounded text-sm ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'border border-gray-200 hover:bg-white text-gray-600'}`}
            >
              {i + 1}
            </button>
          ))}
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-50 hover:bg-white"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductTable;
