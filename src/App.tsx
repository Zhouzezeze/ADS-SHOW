import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import StatCard from './components/StatCard';
import DiagnosisSummary from './components/DiagnosisSummary';
import StatusFilter from './components/StatusFilter';
import FilterBar from './components/FilterBar';
import ProductTable from './components/ProductTable';
import AdChart from './components/AdChart';
import PlatformCompare from './components/PlatformCompare';
import Settings from './pages/Settings';
import ShopeeCallback from './pages/ShopeeCallback';
import DebugPanel from './pages/DebugPanel';
import { useAdData } from './hooks/useAdData';
import type { Platform } from './types';
import { Loader2, AlertCircle, Info } from 'lucide-react';

const App: React.FC = () => {
  // 检测是否在回调路径
  const [isCallback, setIsCallback] = useState(window.location.pathname === '/shopee-callback');

  // 从URL读取初始视图和平台
  const [currentView, setCurrentView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || 'dashboard';
  });
  const [currentPlatform, setCurrentPlatform] = useState<Platform>('total');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState('最近30天');

  const { data, loading, error, isRealData, dataSource } = useAdData(currentPlatform);

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    return data.products.filter(p => {
      const matchesSearch = p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [data, searchQuery, selectedStatus]);

  const statusCounts = useMemo(() => {
    if (!data) return {};
    return data.products.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [data]);

  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">正在拉取广告数据...</p>
        </div>
      );
    }

    if (error || !data) {
      return (
        <div className="bg-red-50 p-8 rounded-2xl border border-red-100 flex flex-col items-center text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-red-900 mb-2">数据加载失败</h3>
          <p className="text-red-700 max-w-md">{error || '无法获取广告数据，请检查网络连接或 API 配置。'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors"
          >
            重新尝试
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Source Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            <Info className="w-3 h-3" />
            数据来源: {dataSource} ({isRealData ? '实时 API' : '模拟数据'})
          </div>
          <div className="text-sm text-gray-500">
            最后更新: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="广告花费" value={data.summary.spend.toFixed(2)} change={4.2} prefix="$" />
          <StatCard title="广告销售额" value={data.summary.sales.toFixed(2)} change={12.5} prefix="$" />
          <StatCard title="ROAS" value={data.summary.roas.toFixed(2)} change={8.1} />
          <StatCard title="点击率 (CTR)" value={data.summary.ctr.toFixed(2)} change={-1.4} suffix="%" />
          <StatCard title="转化率 (CVR)" value={data.summary.cvr.toFixed(2)} change={2.8} suffix="%" />
        </div>

        {/* Diagnosis and Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DiagnosisSummary diagnosis={data.diagnosis} />
            <AdChart 
              data={data.daily} 
              metrics={[
                { key: 'spend', label: '广告花费', color: '#ef4444' },
                { key: 'sales', label: '广告销售额', color: '#10b981' }
              ]} 
            />
          </div>
          <div>
            <PlatformCompare 
              shopee={{ spend: data.summary.spend * 0.4, sales: data.summary.sales * 0.4, roas: data.summary.roas * 0.9, name: 'Shopee' }}
              amazon={{ spend: data.summary.spend * 0.6, sales: data.summary.sales * 0.6, roas: data.summary.roas * 1.1, name: 'Amazon' }}
            />
          </div>
        </div>

        {/* Filtering and Table */}
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">产品表现明细</h3>
          <StatusFilter 
            selectedStatus={selectedStatus} 
            onStatusChange={setSelectedStatus} 
            counts={statusCounts} 
          />
          <FilterBar 
            searchQuery={searchQuery} 
            onSearchChange={setSearchQuery}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onReset={() => {
              setSearchQuery('');
              setSelectedStatus('all');
              setDateRange('最近30天');
            }}
          />
          <ProductTable products={filteredProducts} />
        </div>
      </div>
    );
  };

  // 如果是回调页面，直接渲染回调组件
  if (isCallback) {
    return <ShopeeCallback />;
  }

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    // 更新URL但不刷新页面
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        currentView={currentView} 
        onViewChange={handleViewChange}
        currentPlatform={currentPlatform}
        onPlatformChange={setCurrentPlatform}
      />
      
      <main className="flex-1 ml-64 p-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              {currentView === 'settings' ? '应用设置' : 
               currentPlatform === 'total' ? '全渠道看板' : 
               currentPlatform === 'shopee' ? 'Shopee 广告监控' : 'Amazon 广告监控'}
            </h1>
            <p className="text-gray-500 mt-1">
              {currentView === 'settings' ? '管理您的 API 密钥和平台授权' : '实时追踪跨境电商平台的广告投放效率与转化数据'}
            </p>
          </div>
        </header>

        {currentView === 'settings' ? <Settings /> : 
         currentView === 'debug' ? <DebugPanel /> : renderDashboard()}
      </main>
    </div>
  );
};

export default App;
