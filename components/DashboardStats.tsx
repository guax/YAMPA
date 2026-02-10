import React from 'react';
import { Packet } from '../types';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Layers } from 'lucide-react';

interface DashboardStatsProps {
  packets: Packet[];
  totalPacketCount: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ packets, totalPacketCount }) => {
  // Process data for Type Distribution
  const typeCounts = packets.reduce((acc, packet) => {
    const type = packet.packet.payload_type_name;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(typeCounts).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <div className="flex gap-4 h-full">
      {/* Total Packets Ticker */}
      <div className="flex-1 bg-slate-900/50 rounded-lg border border-slate-700 p-6 flex flex-col items-center justify-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
        
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2 z-10 flex items-center gap-2">
          Total Packets Captured
        </h3>
        
        <div className="flex items-baseline gap-3 z-10">
            <span className="text-6xl font-bold text-white font-mono tracking-tighter drop-shadow-lg">
              {totalPacketCount.toLocaleString()}
            </span>
        </div>
        
        <div className="mt-2 text-xs text-slate-500 font-mono z-10 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
           Last update: {packets.length > 0 ? new Date(packets[0].ts * 1000).toLocaleTimeString() : '--:--:--'}
        </div>

        {/* Decorative background element */}
        <Layers className="absolute -bottom-6 -right-6 w-40 h-40 text-slate-800/50 rotate-12 z-0" />
      </div>

      {/* Packet Type Dist */}
      <div className="w-1/3 min-w-[200px] bg-slate-900/50 rounded-lg border border-slate-700 p-2 flex flex-col hidden md:flex">
         <h3 className="text-xs font-semibold text-slate-400 mb-2 px-2 uppercase tracking-wide">Packet Types</h3>
         <div className="flex-1 min-h-0">
           <ResponsiveContainer width="100%" height="100%">
             <PieChart>
               <Pie
                 data={pieData}
                 cx="50%"
                 cy="50%"
                 innerRadius={25}
                 outerRadius={50}
                 paddingAngle={5}
                 dataKey="value"
               >
                 {pieData.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                 ))}
               </Pie>
               <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', fontSize: '12px', color: '#f1f5f9' }}
                  itemStyle={{ color: '#e2e8f0' }}
               />
               <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  wrapperStyle={{fontSize: '10px', color: '#94a3b8'}}
                  formatter={(value, entry: any) => (
                    <span className="ml-1 text-slate-300">
                      {value} <span className="text-slate-500 font-mono">({entry.payload.value})</span>
                    </span>
                  )}
               />
             </PieChart>
           </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};