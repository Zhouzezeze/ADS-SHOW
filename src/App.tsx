import { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import StatCard from './components/StatCard';
import StatusFilter from './components/StatusFilter';
import FilterBar from './components/FilterBar';
import DiagnosisSummary from './components/DiagnosisSummary';
import ProductTable from './components/ProductTable';
import { useAdData } from './hooks/useAdData';
import type { Platform } from './types';

function App() {
  const [activePlatform, setActivePlatform] = useState<string>('total');
  const [activeStatus, setActiveStatus] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: currentData, loading } = useAdData(activePlatform as Platform);

  const filteredProducts = useMemo(() => {
    if (!currentData) return [];
    let products = currentData.products;

    if (activeStatus !== '全部') {
      products = products.filter(p => p.status === activeStatus);
    }

    if (searchQuery) {
      products = products.filter(p => 
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return products;
  }, [currentData, activeStatus, searchQuery]);

  const statusCounts = useMemo(() => {
    if (!currentData) return {};
    const counts: Record<string, number> = { '全部': currentData.products.length };
    currentData.products.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [currentData]);

  if (loading) {
    return (
      <div className="flex bg-gray-50 min-h-screen min-w-full items-center justify-center">
        <div className="text-xl font-medium text-blue-600 animate-pulse">正在同步广告数据...</div>
      </div>
    );
  }

  if (!currentData) {
    return (
      <div className="flex bg-gray-50 min-h-screen min-w-full items-center justify-center">
        <div className="text-xl font-medium text-red-600">无法加载广告数据，请检查网络或配置</div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#f8f9fa] min-h-screen min-w-full">
      <Sidebar activePlatform={activePlatform} setActivePlatform={setActivePlatform} />
      
      <main className="flex-1 ml-64 p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            广告健康看板
          </h1>
          <p className="text-gray-400 text-xs mt-1">数据来自 Shopee / Amazon API 自动同步 · 诊断基于链接分析缓存</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="总广告花费" value={currentData.summary.spend.toLocaleString()} prefix="R$ " />
          <StatCard title="总广告销售" value={currentData.summary.sales.toLocaleString()} prefix="R$ " />
          <StatCard title="整体 ROAS" value={currentData.summary.roas} suffix="" />
          <StatCard title="问题链接" value={currentData.summary.issueLinks.toLocaleString()} />
        </div>

        <StatusFilter activeStatus={activeStatus} setActiveStatus={setActiveStatus} counts={statusCounts} />
        
        <FilterBar onSearch={setSearchQuery} />

        <DiagnosisSummary diagnosis={currentData.diagnosis} metrics={currentData.summary} />

        <ProductTable products={filteredProducts} />
      </main>
    </div>
  );
}

export default App;
