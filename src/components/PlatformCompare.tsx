import React from 'react';

interface PlatformStat {
  name: string;
  spend: number;
  sales: number;
  roas: number;
}

interface PlatformCompareProps {
  shopee: PlatformStat;
  amazon: PlatformStat;
}

const PlatformCompare: React.FC<PlatformCompareProps> = ({ shopee, amazon }) => {
  const maxSpend = Math.max(shopee.spend, amazon.spend);
  const maxSales = Math.max(shopee.sales, amazon.sales);

  const ComparisonRow = ({ label, sVal, aVal, max, suffix = '', prefix = '' }: any) => (
    <div className="mb-6">
      <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
        <span>{label}</span>
      </div>
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold text-orange-600">
            <span>Shopee</span>
            <span>{prefix}{sVal.toLocaleString()}{suffix}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(sVal / max) * 100}%` }}></div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold text-blue-600">
            <span>Amazon</span>
            <span>{prefix}{aVal.toLocaleString()}{suffix}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(aVal / max) * 100}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">平台数据对比</h3>
      
      <ComparisonRow label="广告总花费" sVal={shopee.spend} aVal={amazon.spend} max={maxSpend} prefix="$" />
      <ComparisonRow label="广告总销售" sVal={shopee.sales} aVal={amazon.sales} max={maxSales} prefix="$" />
      
      <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-50">
        <div className="text-center">
          <div className="text-xs text-gray-500 font-medium">Shopee ROAS</div>
          <div className="text-2xl font-black text-orange-600">{shopee.roas.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 font-medium">Amazon ROAS</div>
          <div className="text-2xl font-black text-blue-600">{amazon.roas.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

export default PlatformCompare;
