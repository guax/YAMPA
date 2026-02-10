import React from 'react';
import { Hash, Lock, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface ChannelData {
  id: string;
  name: string;
  count: number;
  lastActivity: number;
  isEncrypted: boolean;
}

interface ChannelListProps {
  channels: ChannelData[];
  selectedChannelId: string | null;
  onSelectChannel: (id: string) => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({ channels, selectedChannelId, onSelectChannel }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700">
      <div className="p-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Channels ({channels.length})</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {channels.length === 0 ? (
          <div className="p-8 text-center text-slate-600 text-xs">
            Waiting for messages...
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {channels.map((channel) => (
              <div 
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={`p-3 cursor-pointer transition-colors hover:bg-slate-800 ${
                  selectedChannelId === channel.id ? 'bg-slate-800 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                     {channel.isEncrypted ? (
                         <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                     ) : (
                         <Hash className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                     )}
                     <span className={`font-semibold text-sm truncate ${selectedChannelId === channel.id ? 'text-white' : 'text-slate-300'}`}>
                        {channel.name}
                     </span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {channel.count}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                   <div className="flex items-center gap-1">
                     <Clock className="w-3 h-3" />
                     <span>{formatDistanceToNow(new Date(channel.lastActivity * 1000), { addSuffix: true })}</span>
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