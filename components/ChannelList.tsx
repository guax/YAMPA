import React, { useMemo, useState } from 'react';
import { Hash, Lock, Clock, Pencil, X, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { PacketDecoder } from '../services/packetDecoder';

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
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [channelType, setChannelType] = useState<'public' | 'private'>('public');
  const [channelName, setChannelName] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredChannelsRefresh, setRegisteredChannelsRefresh] = useState(0);

  const registeredChannels = useMemo(() => {
    void registeredChannelsRefresh;
    return PacketDecoder.getRegisteredChannels().sort((a, b) => {
      if (a.name === 'Public' && b.name !== 'Public') return -1;
      if (b.name === 'Public' && a.name !== 'Public') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [registeredChannelsRefresh]);

  const canSubmit = useMemo(() => {
    const nameOk = channelName.trim().length > 0;
    if (!nameOk) return false;

    if (channelType === 'private') {
      const secret = secretKey.trim();
      if (secret.length === 0) return false;
      if (secret.length % 2 !== 0) return false;
    }

    return true;
  }, [channelName, channelType, secretKey]);

  const closeRegister = () => {
    setIsRegisterOpen(false);
    setChannelType('public');
    setChannelName('');
    setSecretKey('');
    setIsSubmitting(false);
    setError(null);
  };

  const onRemoveRegisteredChannel = (name: string) => {
    PacketDecoder.removeChannel(name);
    setRegisteredChannelsRefresh((v) => v + 1);
  };

  const onSubmitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const name = channelName.trim();

      if (channelType === 'public') {
        await PacketDecoder.addHashChannel(name);
      } else {
        await PacketDecoder.addPrivateChannel(name, secretKey.trim());
      }

      setRegisteredChannelsRefresh((v) => v + 1);
      setChannelName('');
      setSecretKey('');
      setChannelType('public');
      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register channel');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700">
      <div className="p-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Channels ({channels.length})</h2>
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
            title="Manage channels"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
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

      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeRegister} />
          <div className="relative w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="text-sm font-semibold text-slate-200">Manage Channels</div>
              <button
                type="button"
                onClick={closeRegister}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">Registered channels</div>
                {registeredChannels.length === 0 ? (
                  <div className="text-xs text-slate-600 bg-slate-800/40 border border-slate-800 rounded-md px-3 py-3">
                    No registered channels.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-md border border-slate-800 divide-y divide-slate-800">
                    {registeredChannels.map((ch) => (
                      <div key={ch.name} className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-900">
                        <div className="min-w-0">
                          <div className="text-sm text-slate-200 truncate">{ch.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">hash: {ch.hash}</div>
                        </div>
                        {ch.name === 'Public' ? (
                          <div className="text-[10px] text-slate-500">Default</div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRemoveRegisteredChannel(ch.name)}
                            className="p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-300 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-4">
                <div className="text-xs font-medium text-slate-400 mb-2">Add channel</div>
                <form onSubmit={onSubmitRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                <select
                  value={channelType}
                  onChange={(e) => setChannelType(e.target.value as 'public' | 'private')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Channel name</label>
                <input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="#my-channel"
                  autoFocus
                />
              </div>

              {channelType === 'private' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Secret key</label>
                  <input
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    placeholder="(not used yet)"
                  />
                </div>
              )}

              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeRegister}
                  className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white text-sm transition-colors"
                >
                  {isSubmitting ? 'Registering…' : 'Register'}
                </button>
              </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};