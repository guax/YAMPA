import React, { useState, useMemo } from 'react';
import { Packet } from '../types';
import { PacketRow } from './PacketRow';
import { MessageSquare, MapPin, Share2, HelpCircle, Layers, Filter, Radio } from 'lucide-react';

interface PacketListProps {
  packets: Packet[];
  onSelect: (packet: Packet) => void;
  selectedId?: number;
}

export const PacketList: React.FC<PacketListProps> = ({ packets, onSelect, selectedId }) => {
  const [filterType, setFilterType] = useState<string | null>(null);

  // Calculate stats based on ALL packets passed to this component
  const stats = useMemo(() => {
    const counts: Record<string, number> = {
        'GroupText': 0,
        'TextMessage': 0,
        'Advert': 0,
        'Response': 0,
        'Path': 0,
        'Request': 0,
        'Ack': 0,
        'Trace': 0
    };
    packets.forEach(p => {
        const type = p.packet.payload_type_name;
        counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [packets]);

  // Filter packets for display
  const displayPackets = useMemo(() => {
    if (!filterType) return packets;
    return packets.filter(p => p.packet.payload_type_name === filterType);
  }, [packets, filterType]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'GroupText':
      case 'TextMessage': return <MessageSquare className="w-3.5 h-3.5" />;
      case 'Advert': return <MapPin className="w-3.5 h-3.5" />;
      case 'Response': return <Share2 className="w-3.5 h-3.5" />;
      case 'Path': return <Radio className="w-3.5 h-3.5" />;
      case 'Request': return <HelpCircle className="w-3.5 h-3.5" />;
      case 'Ack': return <HelpCircle className="w-3.5 h-3.5" />;
      case 'Trace': return <Radio className="w-3.5 h-3.5" />;
      default: return <HelpCircle className="w-3.5 h-3.5" />;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'GroupText':
      case 'TextMessage': return 'text-emerald-400';
      case 'Advert': return 'text-blue-400';
      case 'Response': return 'text-orange-400';
      case 'Path': return 'text-purple-400';
      case 'Request': return 'text-yellow-400';
      case 'Ack': return 'text-gray-400';
      case 'Trace': return 'text-indigo-400';
      default: return 'text-slate-400';
    }
  };

  // Sort stats for consistent display order
  const knownTypesOrder = ['GroupText', 'TextMessage', 'Advert', 'Response', 'Path', 'Request', 'Ack', 'Trace'];
  const sortedStats = Object.entries(stats).sort((a, b) => {
     const idxA = knownTypesOrder.indexOf(a[0]);
     const idxB = knownTypesOrder.indexOf(b[0]);
     if (idxA === -1 && idxB === -1) return a[0].localeCompare(b[0]);
     if (idxA === -1) return 1;
     if (idxB === -1) return -1;
     return idxA - idxB;
  });

  return (
    <div className="flex flex-col h-full absolute inset-0">
      {/* Stats / Filter Bar */}
      <div className="flex-none p-2 bg-slate-900 border-b border-slate-700 flex gap-2 overflow-x-auto no-scrollbar items-center">
         {/* All / Total */}
         <button
            onClick={() => setFilterType(null)}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap
                ${!filterType 
                    ? 'bg-slate-800 border-slate-600 text-white shadow-sm' 
                    : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                }
            `}
         >
            <Layers className="w-3.5 h-3.5" />
            <span>All ({packets.length})</span>
         </button>
         
         <div className="w-px h-4 bg-slate-800 mx-1"></div>

         {/* Types */}
         {sortedStats.map(([type, count]) => {
             if (count === 0) return;
             const isSelected = filterType === type;
             const colorClass = getColorClass(type);
             
             // Only show if count > 0 or if it's one of the main types (optional, currently showing all 0s from logic above)
             
             return (
                <button
                    key={type}
                    onClick={() => setFilterType(isSelected ? null : type)}
                    className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap
                        ${isSelected
                            ? 'bg-slate-800 border-slate-600 text-white shadow-sm ring-1 ring-slate-700'
                            : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                        }
                    `}
                >
                    <span className={isSelected ? 'text-white' : colorClass}>
                        {getTypeIcon(type)}
                    </span>
                    <span className={isSelected ? 'text-white' : colorClass}>{type}</span>
                    <span className={`px-1.5 rounded-full text-[10px] min-w-[1.5rem] text-center ${isSelected ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {count}
                    </span>
                </button>
             );
         })}
      </div>

      {/* Table Header */}
      <div className="flex-none bg-slate-900/90 backdrop-blur-sm z-10 grid grid-cols-12 gap-4 px-4 py-3 text-[11px] font-bold text-slate-500 border-b border-slate-800 uppercase tracking-wider">
        <div className="col-span-2">Time</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Node / Info</div>
        <div className="col-span-4">Content / Path</div>
        <div className="col-span-2 text-right">RSSI / SNR</div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-900/50">
         <div className="divide-y divide-slate-800/50">
            {displayPackets.length === 0 ? (
               <div className="p-12 text-center text-slate-600">
                 <div className="flex flex-col items-center gap-3">
                    <Filter className="w-8 h-8 opacity-20" />
                    <p className="text-sm">No packets found {filterType ? `for type ${filterType}` : ''}</p>
                 </div>
               </div>
            ) : (
              displayPackets.map((packet, index) => (
                <PacketRow 
                  key={`${packet.ts}-${index}`} 
                  packet={packet} 
                  onClick={() => onSelect(packet)}
                  isSelected={selectedId === packet.ts}
                />
              ))
            )}
         </div>
      </div>
    </div>
  );
};