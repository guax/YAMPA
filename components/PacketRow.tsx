import React from 'react';
import { Packet } from '../types';
import { format } from 'date-fns';
import { MessageSquare, MapPin, Radio, Share2, HelpCircle } from 'lucide-react';
import { formatPath } from '../utils';

interface PacketRowProps {
  packet: Packet;
  onClick: () => void;
  isSelected: boolean;
}

export const PacketRow: React.FC<PacketRowProps> = ({ packet, onClick, isSelected }) => {
  const typeName = packet.packet.payload_type_name;
  
  // Format timestamp (assuming ts is epoch seconds)
  const date = new Date(packet.ts * 1000);
  const timeStr = format(date, 'HH:mm:ss.SS');

  const getIcon = () => {
    switch (typeName) {
      case 'GroupText': return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'TextMessage': return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'Advert': return <MapPin className="w-4 h-4 text-blue-400" />;
      case 'Response': return <Share2 className="w-4 h-4 text-orange-400" />;
      case 'Path': return <Radio className="w-4 h-4 text-purple-400" />;
      case 'Request': return <HelpCircle className="w-4 h-4 text-yellow-400" />;
      case 'Ack': return <HelpCircle className="w-4 h-4 text-gray-400" />;
      case 'Trace': return <Radio className="w-4 h-4 text-indigo-400" />;
      default: return <HelpCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getInfo = () => {
    if (packet.decoded.group_text) {
      return packet.decoded.group_text.sender_name || 'Unknown Sender';
    }
    if (packet.decoded.advert) {
      return packet.decoded.advert.appdata.node_name || 'Unknown Node';
    }
    if (packet.decoded.path) {
      return 'Path Update';
    }
    return packet.packet.route_type_name;
  };

  const getContent = () => {
    if (packet.decoded.group_text) {
      return (
        <span className="text-slate-300">
          {packet.decoded.group_text.text || (packet.decoded.group_text.decrypted ? '<Empty>' : '<Encrypted>')}
        </span>
      );
    }
    if (packet.decoded.advert) {
      const { latitude, longitude } = packet.decoded.advert.appdata;
      if (latitude && longitude) {
        return <span className="text-blue-300">Loc: {latitude.toFixed(4)}, {longitude.toFixed(4)}</span>;
      }
      return <span className="text-slate-500">Node Announcement</span>;
    }
    if (packet.packet.payload_type_name === 'Response') {
       return <span className="text-slate-500 font-mono text-xs">{packet.payload.hex.substring(0, 16)}...</span>
    }
    // Updated to use formatPath
    return <span className="text-slate-500 font-mono text-xs" title={formatPath(packet.routing.path)}>{formatPath(packet.routing.path)}</span>;
  };

  return (
    <div 
      onClick={onClick}
      className={`grid grid-cols-12 gap-4 px-4 py-3 text-sm cursor-pointer border-l-4 transition-colors hover:bg-slate-800 ${
        isSelected ? 'bg-slate-800 border-blue-500' : 'bg-transparent border-transparent'
      }`}
    >
      <div className="col-span-2 font-mono text-slate-400">{timeStr}</div>
      <div className="col-span-2 flex items-center gap-2">
        {getIcon()}
        <span className={`font-medium ${
          typeName === 'GroupText' ? 'text-emerald-400' : 
          typeName === 'Advert' ? 'text-blue-400' : 
          typeName === 'Response' ? 'text-orange-400' :
          typeName === 'Path' ? 'text-purple-400' :
          typeName === 'Request' ? 'text-yellow-400' :
          typeName === 'Ack' ? 'text-gray-400' :
          typeName === 'Trace' ? 'text-indigo-400' :
          'text-slate-400'
        }`}>
          {typeName}
        </span>
      </div>
      <div className="col-span-2 truncate text-slate-200" title={getInfo()}>
        {getInfo()}
      </div>
      <div className="col-span-4 truncate text-slate-400">
        {getContent()}
      </div>
      <div className="col-span-2 text-right flex items-center justify-end gap-3 font-mono text-xs">
        <span className={packet.radio.rssi > -90 ? 'text-green-400' : 'text-yellow-600'}>
          {packet.radio.rssi}
        </span>
        <span className="text-slate-600">/</span>
        <span className="text-slate-400">{packet.radio.snr}</span>
      </div>
    </div>
  );
};