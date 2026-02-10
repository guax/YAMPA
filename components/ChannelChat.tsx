import React, { useRef, useEffect } from 'react';
import { Packet } from '../types';
import { format } from 'date-fns';
import { Lock, User } from 'lucide-react';

interface ChannelChatProps {
  packets: Packet[];
  onSelectPacket: (packet: Packet) => void;
  channelName: string;
}

export const ChannelChat: React.FC<ChannelChatProps> = ({ packets, onSelectPacket, channelName }) => {
  // Sort chronologically for chat
  const sortedPackets = [...packets].sort((a, b) => a.ts - b.ts);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [packets.length, channelName]);

  return (
    <div className="flex flex-col h-full bg-slate-900/50">
       <div className="flex-none p-3 border-b border-slate-700 bg-slate-900/80 backdrop-blur text-sm font-semibold text-slate-200 flex items-center gap-2">
           <span className="text-slate-400">#</span> {channelName}
       </div>
       
       <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {sortedPackets.length === 0 ? (
              <div className="text-center text-slate-500 py-10 text-sm">No messages in this channel yet.</div>
          ) : (
              sortedPackets.map((packet, idx) => {
                  const decoded = packet.decoded.group_text;
                  if (!decoded) return null;
                  
                  const isDecrypted = decoded.decrypted;
                  const sender = decoded.sender_name || 'Unknown Sender';
                  const text = decoded.text || '';
                  const time = format(new Date(packet.ts * 1000), 'HH:mm');
                  
                  // Helper to generate a consistent color from string
                  const getSenderColor = (name: string) => {
                      let hash = 0;
                      for (let i = 0; i < name.length; i++) {
                          hash = name.charCodeAt(i) + ((hash << 5) - hash);
                      }
                      const colors = ['text-red-400', 'text-blue-400', 'text-green-400', 'text-yellow-400', 'text-purple-400', 'text-pink-400', 'text-indigo-400'];
                      return colors[Math.abs(hash) % colors.length];
                  };

                  return (
                      <div key={`${packet.ts}-${idx}`} className="flex gap-3 hover:bg-slate-800/30 p-2 rounded-lg group transition-colors">
                          <div className="flex-none mt-1">
                              <div className={`w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 ${getSenderColor(sender)}`}>
                                  <User className="w-4 h-4" />
                              </div>
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                  <span className={`text-sm font-bold ${getSenderColor(sender)}`}>
                                      {sender}
                                  </span>
                                  <span className="text-[10px] text-slate-600 font-mono">
                                      {time}
                                  </span>
                                  {!isDecrypted && (
                                      <Lock className="w-3 h-3 text-red-500/50" />
                                  )}
                              </div>
                              <div 
                                className="text-sm text-slate-300 whitespace-pre-wrap break-words mt-0.5 cursor-pointer hover:text-white"
                                onClick={() => onSelectPacket(packet)}
                              >
                                  {isDecrypted ? text : <span className="italic text-slate-600 flex items-center gap-1"><Lock className="w-3 h-3"/> Encrypted Message</span>}
                              </div>
                          </div>
                      </div>
                  );
              })
          )}
       </div>
    </div>
  );
};