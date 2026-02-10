import React from 'react';
import { DiscoveredNode, Packet } from '../types';
import { X, Map, Activity, Clock, Hash, Signal } from 'lucide-react';
import { format } from 'date-fns';

interface NodeDetailsProps {
  node: DiscoveredNode;
  packets: Packet[]; // Packets related to this node
  onClose: () => void;
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({ node, packets, onClose }) => {
  return (
    <div className="flex flex-col h-full text-slate-300 bg-slate-800">
      <div className="flex-none flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-white">{node.name}</h2>
          <div className="text-xs font-mono text-slate-400">Node Inspector</div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Status Card */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 flex justify-between items-center">
          <div>
            <div className="text-xs text-slate-500 mb-1">Status</div>
            <div className="text-emerald-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Active
            </div>
          </div>
           <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">Packets Seen</div>
            <div className="text-white font-mono text-xl">{node.packet_count}</div>
          </div>
        </div>

        {/* Location Info */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Map className="w-4 h-4 text-blue-400" />
            Location Data
          </h3>
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
             {node.latitude && node.longitude ? (
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <div className="text-xs text-slate-500">Latitude</div>
                   <div className="font-mono text-slate-200">{node.latitude.toFixed(6)}</div>
                 </div>
                 <div>
                    <div className="text-xs text-slate-500">Longitude</div>
                   <div className="font-mono text-slate-200">{node.longitude.toFixed(6)}</div>
                 </div>
               </div>
             ) : (
               <div className="text-sm text-slate-500 italic">No GPS location data received.</div>
             )}
          </div>
        </div>

        {/* Signal Stats */}
         <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Signal className="w-4 h-4 text-green-400" />
            Last Link Quality
          </h3>
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-500 block mb-1">RSSI</span>
                <span className={`text-lg font-mono font-bold ${node.last_rssi > -90 ? 'text-green-400' : 'text-yellow-500'}`}>{node.last_rssi} dBm</span>
             </div>
             <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-500 block mb-1">SNR</span>
                <span className="text-lg font-mono font-bold text-slate-300">{node.last_snr} dB</span>
             </div>
          </div>
        </div>

        {/* Identity */}
        <div className="space-y-2">
           <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Hash className="w-4 h-4 text-purple-400" />
            Identity
          </h3>
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 overflow-hidden">
             {node.pub_key ? (
               <div>
                  <div className="text-xs text-slate-500 mb-1">Public Key</div>
                  <div className="font-mono text-xs text-slate-300 break-all">{node.pub_key}</div>
               </div>
             ) : (
               <div className="text-sm text-slate-500">Public key not yet exchanged.</div>
             )}
          </div>
        </div>
        
        <div className="text-xs text-slate-600 text-center pt-4">
           Last updated: {format(new Date(node.last_seen * 1000), 'yyyy-MM-dd HH:mm:ss')}
        </div>
      </div>
    </div>
  );
};