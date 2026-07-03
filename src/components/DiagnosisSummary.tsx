import React from 'react';
import { CheckCircle2, TrendingUp, AlertTriangle, Wallet, EyeOff } from 'lucide-react';

interface DiagnosisSummaryProps {
  diagnosis: {
    totalSkus: number;
    burningSkus: number;
    canAddBudget: number;
    highImpNoConv: number;
    overallRoas: number;
  };
  metrics: {
    spend: number;
    sales: number;
  };
}

const DiagnosisSummary: React.FC<DiagnosisSummaryProps> = ({ diagnosis, metrics }) => {
  return (
    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 mb-6">
      <div className="flex items-center space-x-2 mb-6">
        <CheckCircle2 className="text-emerald-500" size={24} />
        <div>
          <h2 className="text-lg font-bold text-emerald-900">
            整体 ROAS {diagnosis.overallRoas}，{diagnosis.totalSkus} 个 SKU 投放中
          </h2>
          <p className="text-emerald-700 text-sm">烧钱 {diagnosis.burningSkus} / 待放大 {diagnosis.canAddBudget} / 高曝低转 {diagnosis.highImpNoConv}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-emerald-600 flex items-center gap-1 mb-1">
            <Wallet size={12} /> 总花费
          </span>
          <span className="text-lg font-bold text-emerald-900">R$ {metrics.spend.toLocaleString()}</span>
          <span className="text-[10px] text-emerald-500">本页广告投放</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs text-emerald-600 flex items-center gap-1 mb-1">
            <TrendingUp size={12} /> 总销售
          </span>
          <span className="text-lg font-bold text-emerald-900">R$ {metrics.sales.toLocaleString()}</span>
          <span className="text-[10px] text-emerald-500">广告带动</span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-emerald-600 flex items-center gap-1 mb-1">
            <CheckCircle2 size={12} /> 整体 ROAS
          </span>
          <span className="text-lg font-bold text-emerald-900">{diagnosis.overallRoas}</span>
          <span className="text-[10px] text-emerald-500">✔ 高效</span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-emerald-600 flex items-center gap-1 mb-1">
            <AlertTriangle size={12} /> 烧钱 SKU
          </span>
          <span className="text-lg font-bold text-emerald-900">{diagnosis.burningSkus}</span>
          <span className="text-[10px] text-emerald-500">ROAS &lt; 1 + 花费 &gt; 阈值</span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-emerald-600 flex items-center gap-1 mb-1">
            <TrendingUp size={12} /> 可加预算
          </span>
          <span className="text-lg font-bold text-emerald-900">{diagnosis.canAddBudget}</span>
          <span className="text-[10px] text-emerald-500">ROAS &gt; 5 待放大</span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-emerald-600 flex items-center gap-1 mb-1">
            <EyeOff size={12} /> 高曝无转化
          </span>
          <span className="text-lg font-bold text-emerald-900">{diagnosis.highImpNoConv}</span>
          <span className="text-[10px] text-emerald-500">高曝光 + CVR &lt; 0.5%</span>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisSummary;
