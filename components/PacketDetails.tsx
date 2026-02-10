import React from 'react';
import { Packet } from '../types';
import { X, Copy, Radio, Route, Database, Lock, Unlock, Clock, Hash, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface PacketDetailsProps {
  packet: Packet;
  onClose: () => void;
}

export const PacketDetails: React.FC<PacketDetailsProps> = ({ packet, onClose }) => {
  const date = new Date(packet.ts * 1000);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Helper to visualize path bytes
  const renderPathChain = (path: string) => {
    if (!path) return <span className="text-slate-500 italic">No routing path</span>;
    
    // Split hex string into bytes (2 chars)
    const hops = path.match(/.{1,2}/g) || [];
    
    return (
      <div className="flex flex-wrap gap-2 items-center mt-2">
        {hops.map((hop, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center group relative">
               <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center font-mono text-xs text-purple-300 shadow-sm group-hover:border-purple-400 transition-colors">
                 {hop}
               </div>
               <div className="absolute -bottom-5 text-[10px] text-slate-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                 Node {hop}
               </div>
            </div>
            {index < hops.length - 1 && (
              <ArrowRight className="w-3 h-3 text-slate-600" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full text-slate-300 bg-slate-800">
      {/* Header */}
      <div className="flex-none flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-white">Packet Details</h2>
          <div className="text-xs font-mono text-slate-400">{packet.packet.payload_type_name} • ID: {packet.packet.crc.toString(16).toUpperCase()}</div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Meta Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Clock className="w-3 h-3" /> Timestamp
            </div>
            <div className="font-mono text-sm">{format(date, 'yyyy-MM-dd HH:mm:ss')}</div>
            <div className="font-mono text-xs text-slate-500">{packet.ts}</div>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
             <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Radio className="w-3 h-3" /> Radio Signal
            </div>
            <div className="flex justify-between items-end">
              <div>
                <span className="text-xs text-slate-500">RSSI</span>
                <div className={`font-mono text-lg font-bold ${packet.radio.rssi > -90 ? 'text-green-400' : 'text-yellow-500'}`}>
                  {packet.radio.rssi} <span className="text-xs font-normal text-slate-500">dBm</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">SNR</span>
                <div className="font-mono text-sm text-slate-300">{packet.radio.snr} dB</div>
              </div>
            </div>
          </div>
        </div>

        {/* Decoded Content */}
        {packet.decoded && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              Decoded Payload
            </h3>
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 font-mono text-sm overflow-x-auto">
              {packet.decoded.group_text ? (
                <div className="space-y-2">
                   <div className="flex items-center gap-2">
                    {packet.decoded.group_text.decrypted ? (
                      <Unlock className="w-3 h-3 text-green-500" />
                    ) : (
                      <Lock className="w-3 h-3 text-red-500" />
                    )}
                    <span className="text-xs uppercase text-slate-500">
                      {packet.decoded.group_text.decrypted ? 'Decrypted' : 'Encrypted'}
                    </span>
                   </div>
                   {packet.decoded.group_text.channel_name && (
                     <div>
                       <span className="text-slate-500">Channel:</span> <span className="text-yellow-400">{packet.decoded.group_text.channel_name}</span>
                     </div>
                   )}
                   {packet.decoded.group_text.sender_name && (
                     <div>
                       <span className="text-slate-500">Sender:</span> <span className="text-blue-400">{packet.decoded.group_text.sender_name}</span>
                     </div>
                   )}
                   <div className="mt-2 p-2 bg-slate-800 rounded border border-slate-700 text-emerald-100 whitespace-pre-wrap">
                     {packet.decoded.group_text.text || "— No Content —"}
                   </div>
                </div>
              ) : packet.decoded.advert ? (
                 <div className="space-y-2">
                    <div>
                      <span className="text-slate-500">Node:</span> <span className="text-blue-400">{packet.decoded.advert.appdata.node_name}</span>
                    </div>
                    {packet.decoded.advert.appdata.latitude && (
                      <div>
                        <span className="text-slate-500">Position:</span> <span className="text-yellow-400">
                          {packet.decoded.advert.appdata.latitude}, {packet.decoded.advert.appdata.longitude}
                        </span>
                      </div>
                    )}
                 </div>
              ) : (
                <pre className="text-xs text-slate-400">
                  {JSON.stringify(packet.decoded, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Routing Info */}
        <div className="space-y-2">
           <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Route className="w-4 h-4 text-purple-400" />
              Routing
            </h3>
             <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
               <div className="flex justify-between text-xs text-slate-500 mb-2">
                 <span>Type: {packet.packet.route_type_name}</span>
                 <span>Hops: {packet.routing.path_len}</span>
               </div>
               
               {/* Visual Chain */}
               {renderPathChain(packet.routing.path)}

               <div className="mt-4 font-mono text-[10px] text-slate-500 break-all bg-black/20 p-2 rounded">
                 Raw: {packet.routing.path}
               </div>
             </div>
        </div>

        {/* Raw Data */}
         <div className="space-y-2">
           <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-400" />
                Raw Packet
            </h3>
            <button 
              onClick={() => copyToClipboard(packet.raw_packet.hex)}
              className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white"
              title="Copy Hex"
            >
              <Copy className="w-3 h-3" />
            </button>
           </div>
           <div className="bg-black rounded-lg p-3 border border-slate-800 font-mono text-xs text-slate-500 break-all leading-relaxed">
             {packet.raw_packet.hex}
           </div>
        </div>
      </div>
    </div>
  );
};