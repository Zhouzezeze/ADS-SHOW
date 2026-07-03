import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import type { DailyData } from '../types';

interface AdChartProps {
  data: DailyData[];
  metrics: { key: keyof DailyData; label: string; color: string }[];
}

const AdChart: React.FC<AdChartProps> = ({ data, metrics }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[400px]">
      <h3 className="text-lg font-bold text-gray-900 mb-6">投放趋势分析</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            {metrics.map((m) => (
              <linearGradient key={m.key} id={`color${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={m.color} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={m.color} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748b' }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748b' }} 
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
          />
          <Legend verticalAlign="top" align="right" iconType="circle" />
          {metrics.map((m) => (
            <Area
              key={m.key}
              type="monotone"
              dataKey={m.key}
              name={m.label}
              stroke={m.color}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#color${m.key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AdChart;
