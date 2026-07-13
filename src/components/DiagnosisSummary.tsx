import React from 'react';
import { Target, TrendingUp, AlertCircle, ShoppingBag, PlusCircle, Frown } from 'lucide-react';
import type { DiagnosisInfo } from '../types';

interface DiagnosisSummaryProps {
  diagnosis: DiagnosisInfo;
}

const DiagnosisSummary: React.FC<DiagnosisSummaryProps> = ({ diagnosis }) => {
  const safeNum = (v: any, fallback = 0) => {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? fallback : n;
  };

  const cards = [
    { label: '总花费', value: `฿${safeNum(diagnosis?.totalSpend).toFixed(2)}`, icon: TrendingUp, color: 'text-blue-600' },
    { label: '总销售', value: `฿${safeNum(diagnosis?.totalSales).toFixed(2)}`, icon: ShoppingBag, color: 'text-indigo-600' },
    { label: '整体ROAS', value: safeNum(diagnosis?.overallRoas).toFixed(2), icon: Target, color: 'text-emerald-600' },
    { label: '烧钱SKU数', value: diagnosis?.burningSkus ?? 0, icon: AlertCircle, color: 'text-red-600' },
    { label: '可加预算数', value: diagnosis?.canAddBudget ?? 0, icon: PlusCircle, color: 'text-green-600' },
    { label: '高曝无转化数', value: diagnosis?.highImpNoConv ?? 0, icon: Frown, color: 'text-orange-600' },
  ];

  return (
    <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 mb-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
            AI 投放诊断汇总
            <span className="text-sm font-normal text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              SKU 总数: {diagnosis?.totalSkus ?? 0}
            </span>
          </h2>
          <p className="text-emerald-700 text-sm mt-1">诊断建议：{diagnosis?.suggestion || '暂无建议'}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-emerald-600 font-medium uppercase tracking-wider">当前整体 ROAS</div>
          <div className="text-3xl font-black text-emerald-700">{safeNum(diagnosis?.overallRoas).toFixed(2)}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100 flex flex-col items-center text-center">
            <card.icon className={`w-6 h-6 mb-2 ${card.color}`} />
            <div className="text-xs text-gray-500 font-medium">{card.label}</div>
            <div className="text-lg font-bold text-gray-900">{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiagnosisSummary;
