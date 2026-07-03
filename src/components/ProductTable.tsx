import React from 'react';
import type { ProductData } from '../types';

interface ProductTableProps {
  products: ProductData[];
}

const ProductTable: React.FC<ProductTableProps> = ({ products }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
            <tr>
              <th className="px-4 py-3">诊断</th>
              <th className="px-4 py-3">日期</th>
              <th className="px-4 py-3">商品</th>
              <th className="px-4 py-3">曝光</th>
              <th className="px-4 py-3">点击</th>
              <th className="px-4 py-3">CTR</th>
              <th className="px-4 py-3">转化</th>
              <th className="px-4 py-3">CVR</th>
              <th className="px-4 py-3">广告销售</th>
              <th className="px-4 py-3">花费</th>
              <th className="px-4 py-3">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    product.status === '正常' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {product.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{product.date}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <img src={product.image} alt={product.name} className="w-10 h-10 rounded object-cover bg-gray-100" />
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{product.sku}</span>
                      <span className="text-[10px] text-gray-500 truncate max-w-[120px]">{product.name}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{product.impressions.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-600">{product.clicks.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-600">{product.ctr}%</td>
                <td className="px-4 py-3 text-gray-600">{product.orders}</td>
                <td className="px-4 py-3 text-gray-600">{product.cvr}%</td>
                <td className="px-4 py-3 font-medium text-gray-900">{product.sales.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-600">{product.spend.toLocaleString()}</td>
                <td className="px-4 py-3 font-bold text-blue-600">{product.roas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;
