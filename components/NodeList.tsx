import React from 'react';
import { DiscoveredNode } from '../types';
import { Wifi, Clock, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NodeListProps {
  nodes: DiscoveredNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}

export const NodeList: React.FC<NodeListProps> = ({ nodes, selectedNodeId, onSelectNode }) => {
  // Sort by last seen descending
  const sortedNodes = [...nodes].sort((a, b) => b.last_seen - a.last_seen);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700">
      <div className="p-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Discovered Nodes ({nodes.length})</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sortedNodes.length === 0 ? (
          <div className="p-8 text-center text-slate-600 text-xs">
            Scanning for nodes...
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {sortedNodes.map((node) => (
              <div 
                key={node.id}
                onClick={() => onSelectNode(selectedNodeId === node.id ? null : node.id)}
                className={`p-3 cursor-pointer transition-colors hover:bg-slate-800 ${
                  selectedNodeId === node.id ? 'bg-slate-800 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-semibold text-sm ${selectedNodeId === node.id ? 'text-white' : 'text-slate-300'}`}>
                    {node.name}
                  </span>
                  {node.latitude && node.longitude && (
                     <MapPin className="w-3 h-3 text-blue-400" />
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                   <div className="flex items-center gap-1">
                     <Clock className="w-3 h-3" />
                     <span>{formatDistanceToNow(new Date(node.last_seen * 1000), { addSuffix: true })}</span>
                   </div>
                   <div className="flex items-center gap-1" title={`${node.last_rssi} dBm`}>
                     <Wifi className={`w-3 h-3 ${node.last_rssi > -90 ? 'text-green-500' : node.last_rssi > -110 ? 'text-yellow-500' : 'text-red-500'}`} />
                     <span>{node.last_rssi}</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};