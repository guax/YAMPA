import React from 'react';
import { Packet } from '../types';
import { MessageSquare, MapPin, Share2, HelpCircle, Layers } from 'lucide-react';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface HeaderStatsProps {
  packets: Packet[];
  totalPacketCount: number;
}

export const HeaderStats: React.FC<HeaderStatsProps> = ({ packets, totalPacketCount }) => {
  // Initialize with 0 for known types so they are always displayed
  const stats: Record<string, number> = {
    'GRP_TXT': 0,
    'TXT_MSG': 0,
    'ADVERT': 0,
    'RESPONSE': 0
  };

  // Calculate counts from the current packet buffer
  packets.forEach(p => {
    const type = p.packet.payload_type_name;
    stats[type] = (stats[type] || 0) + 1;
  });

  const data = Object.entries(stats).map(([name, value]) => ({ name, value }));
  
  // Sort data by order of known types to keep UI consistent
  const knownTypesOrder = ['GRP_TXT', 'TXT_MSG', 'ADVERT', 'RESPONSE'];
  data.sort((a, b) => {
     const idxA = knownTypesOrder.indexOf(a.name);
     const idxB = knownTypesOrder.indexOf(b.name);
     // If both unknown, sort alpha
     if (idxA === -1 && idxB === -1) return a.name.localeCompare(b.name);
     // Known comes first
     if (idxA === -1) return 1;
     if (idxB === -1) return -1;
     return idxA - idxB;
  });

  const getColor = (name: string) => {
    switch (name) {
      case 'GRP_TXT':
      case 'TXT_MSG': return '#34d399'; // emerald-400
      case 'ADVERT': return '#60a5fa'; // blue-400
      case 'RESPONSE': return '#fb923c'; // orange-400
      default: return '#64748b'; // slate-500
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'GRP_TXT':
      case 'TXT_MSG': return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'ADVERT': return <MapPin className="w-4 h-4 text-blue-400" />;
      case 'RESPONSE': return <Share2 className="w-4 h-4 text-orange-400" />;
      default: return <HelpCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="flex items-center gap-6 h-full">
       {/* Total Count */}
       <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/50 rounded-lg border border-slate-700 shadow-sm">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="font-mono font-bold text-white text-sm">{totalPacketCount.toLocaleString()}</span>
       </div>

       {/* Separator */}
       <div className="h-6 w-px bg-slate-700 hidden sm:block" />

       {/* Mini Bar Chart */}
       <div className="w-24 h-8 hidden sm:block">
         <ResponsiveContainer width="100%" height="100%">
           <BarChart data={data}>
             <Bar dataKey="value" radius={[2, 2, 0, 0]}>
               {data.map((entry, index) => (
                 <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
               ))}
             </Bar>
             <Tooltip 
               cursor={{fill: 'transparent'}}
               contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px', padding: '4px' }}
               itemStyle={{ color: '#e2e8f0' }}
               formatter={(value: number) => [value, '']}
             />
           </BarChart>
         </ResponsiveContainer>
       </div>

       {/* Icon Counts */}
       <div className="flex items-center gap-4">
         {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2 group cursor-help transition-opacity hover:opacity-100 opacity-80" title={entry.name}>
               {getTypeIcon(entry.name)}
               <span className="font-mono text-xs text-slate-300 font-medium">{entry.value}</span>
            </div>
         ))}
       </div>
    </div>
  );
};