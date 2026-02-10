import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Packet, DiscoveredNode } from './types';
import { StreamService, ConnectionStatus } from './services/streamService';
import { PacketList } from './components/PacketList';
import { PacketDetails } from './components/PacketDetails';
import { NodeList } from './components/NodeList';
import { NodeDetails } from './components/NodeDetails';
import { ChannelList, ChannelData } from './components/ChannelList';
import { ChannelChat } from './components/ChannelChat';
import { NodeMap } from './components/NodeMap';
import { Radio, Pause, Play, Trash2, Filter, FlaskConical, AlertCircle, Activity, MessageCircle, Map as MapIcon } from 'lucide-react';
import { extractNodeFromPacket } from './utils';

type ViewMode = 'analyzer' | 'channels' | 'map';

const App: React.FC = () => {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [totalPacketCount, setTotalPacketCount] = useState(0);
  
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('analyzer');

  // Node Management
  const [nodes, setNodes] = useState<Map<string, DiscoveredNode>>(new Map());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Channel Management
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [isSimulation, setIsSimulation] = useState(false);
  
  const streamServiceRef = useRef<StreamService | null>(null);

  useEffect(() => {
    // Initialize stream service
    streamServiceRef.current = new StreamService();
    
    // Subscribe to Data
    const unsubscribeData = streamServiceRef.current.subscribe((packet) => {
      // 1. Packet Management
      setPackets((prev) => {
        const newPackets = [packet, ...prev];
        if (newPackets.length > 500) return newPackets.slice(0, 500);
        return newPackets;
      });
      setTotalPacketCount(prev => prev + 1);

      // 2. Node Discovery Logic
      const nodeInfo = extractNodeFromPacket(packet);
      if (nodeInfo && nodeInfo.id) {
        setNodes((prevNodes) => {
          const newMap = new Map(prevNodes);
          const existing: DiscoveredNode | undefined = newMap.get(nodeInfo.id!);
          
          newMap.set(nodeInfo.id!, {
            id: nodeInfo.id!,
            name: nodeInfo.name!,
            packet_count: (existing?.packet_count || 0) + 1,
            last_seen: nodeInfo.last_seen!,
            last_rssi: nodeInfo.last_rssi!,
            last_snr: nodeInfo.last_snr!,
            pub_key: nodeInfo.pub_key || (existing?.pub_key) || '',
            latitude: nodeInfo.latitude || (existing?.latitude) || undefined,
            longitude: nodeInfo.longitude || (existing?.longitude) || undefined,
            is_router: nodeInfo.is_router || (existing?.is_router) || false,
          });
          return newMap;
        });
      }
    });

    // Subscribe to Status
    const unsubscribeStatus = streamServiceRef.current.subscribeStatus((status) => {
        setConnectionStatus(status);
    });

    // Start default mode (Real WS)
    streamServiceRef.current.start();

    return () => {
      unsubscribeData();
      unsubscribeStatus();
      streamServiceRef.current?.stop();
    };
  }, []);

  const togglePause = () => {
    if (streamServiceRef.current) {
      if (isPaused) {
        streamServiceRef.current.resume();
      } else {
        streamServiceRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const toggleSimulation = () => {
      if (streamServiceRef.current) {
          const newMode = !isSimulation;
          setIsSimulation(newMode);
          streamServiceRef.current.setSimulationMode(newMode);
          // Reset paused state when switching modes usually feels better
          setIsPaused(false); 
          streamServiceRef.current.resume();
      }
  };

  const clearPackets = () => {
    setPackets([]);
    setTotalPacketCount(0);
    setSelectedPacket(null);
    setNodes(new Map()); 
    // We don't necessarily clear channels derived from packets since packets are cleared
  };

  const handlePacketSelect = (packet: Packet) => {
    if (selectedPacket?.ts === packet.ts) {
        setSelectedPacket(null);
    } else {
        setSelectedPacket(packet);
    }
  };

  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    setSelectedPacket(null); // Clear packet selection to show Node Details in right panel
  };

  // --- Derived State ---

  // 1. Channels
  const channels = useMemo(() => {
    const channelMap = new Map<string, ChannelData>();
    packets.forEach(p => {
      if (p.packet.payload_type_name === 'GroupText' && p.decoded.group_text) {
          const info = p.decoded.group_text;
          const id = info.channel_name;
          const name = info.channel_name;
          
          if (!channelMap.has(id)) {
              channelMap.set(id, { 
                  id, 
                  name, 
                  count: 0, 
                  lastActivity: 0, 
                  isEncrypted: false 
              });
          }
          
          const ch = channelMap.get(id)!;
          ch.count++;
          ch.lastActivity = Math.max(ch.lastActivity, p.ts);
          ch.isEncrypted = !info.decrypted;
      }
    });
    return Array.from(channelMap.values()).sort((a, b) => b.lastActivity - a.lastActivity);
  }, [packets]);

  // 2. Filtered Packets for Analyzer
  const filteredPacketsAnalyzer = selectedNodeId 
    ? packets.filter(p => {
        return (p.decoded.group_text?.sender_name === selectedNodeId) || 
               (p.decoded.advert?.appdata.node_name === selectedNodeId);
      })
    : packets;

  // 3. Filtered Packets for Channels
  const filteredPacketsChannel = useMemo(() => {
     if (!selectedChannelId) return [];
     return packets.filter(p => {
         if (p.packet.payload_type_name !== 'GroupText' || !p.decoded.group_text) return false;
         const info = p.decoded.group_text;
         const id = info.channel_name;
         return id === selectedChannelId;
     });
  }, [packets, selectedChannelId]);


  // Determine what to show in Right Panel
  const showPacketDetails = selectedPacket !== null;
  // In Map mode, we also want to show node details if a node is selected
  const showNodeDetails = !selectedPacket && selectedNodeId !== null && (viewMode === 'analyzer' || viewMode === 'map');
  const isDetailsVisible = showPacketDetails || showNodeDetails;

  // Status Indicator Helper
  const getStatusIndicator = () => {
      if (isPaused) return { color: 'bg-yellow-500', text: 'Paused' };
      if (isSimulation) return { color: 'bg-purple-500', text: 'Simulation' };
      
      switch (connectionStatus) {
          case 'connected': return { color: 'bg-green-500 animate-pulse', text: 'Live' };
          case 'connecting': return { color: 'bg-yellow-500', text: 'Connecting...' };
          case 'error': return { color: 'bg-red-500', text: 'Error' };
          default: return { color: 'bg-slate-500', text: 'Offline' };
      }
  };

  const status = getStatusIndicator();

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      {/* Header */}
      <header className="flex-none h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shadow-md z-10 gap-4">
        {/* Logo and Status */}
        <div className="flex items-center gap-3 shrink-0">
          <div className={`p-2 rounded-lg transition-colors ${isSimulation ? 'bg-purple-900/50' : 'bg-blue-600'}`}>
            <Radio className={`w-6 h-6 ${isSimulation ? 'text-purple-400' : 'text-white'}`} />
          </div>
          <div className="mr-6">
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">YAMPA</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${status.color}`}></span>
              {status.text}
            </div>
          </div>

          {/* View Switcher */}
          <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700">
             <button 
                onClick={() => setViewMode('analyzer')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'analyzer' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
             >
                <Activity className="w-4 h-4" />
                Analyzer
             </button>
             <button 
                onClick={() => setViewMode('channels')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'channels' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
             >
                <MessageCircle className="w-4 h-4" />
                Channels
             </button>
             <button 
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'map' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
             >
                <MapIcon className="w-4 h-4" />
                Map
             </button>
          </div>
        </div>

        {/* Center: Alerts and Messages */}
        <div className="flex-1 flex justify-center items-center">
           {!isSimulation && !isPaused && connectionStatus !== 'connected' && (
             <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-200 rounded-full text-xs animate-pulse">
                <AlertCircle className="w-3 h-3" />
                <span>{connectionStatus === 'connecting' ? 'Attempting connection...' : 'Connection lost. Retrying...'}</span>
             </div>
           )}
           {isPaused && (
             <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-full text-xs">
                <Pause className="w-3 h-3" />
                <span>Stream Paused</span>
             </div>
           )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-4 w-auto shrink-0 justify-end">
          <div className="flex gap-2">
            
            {/* Simulation Toggle */}
            <button
              onClick={toggleSimulation}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md transition-all border
                ${isSimulation 
                    ? 'bg-purple-900/30 border-purple-500/50 text-purple-300 hover:bg-purple-900/50' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                }
              `}
              title={isSimulation ? "Switch to Real Stream" : "Switch to Simulation Mode"}
            >
                <FlaskConical className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">{isSimulation ? 'Simulating' : 'Simulate'}</span>
            </button>

            <div className="w-px h-8 bg-slate-700 mx-2"></div>

            <button 
              onClick={togglePause}
              className={`p-2 rounded-md transition-colors ${isPaused ? 'bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
              title={isPaused ? "Resume Stream" : "Pause Stream"}
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
            <button 
              onClick={clearPackets}
              className="p-2 bg-slate-700 hover:bg-red-900/30 hover:text-red-400 text-slate-200 rounded-md transition-colors"
              title="Clear Buffer"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Column 1: Left Sidebar (Context sensitive) */}
        <div className="w-64 flex-none border-r border-slate-700 hidden md:flex flex-col bg-slate-900">
           {viewMode === 'analyzer' || viewMode === 'map' ? (
               <NodeList 
                 nodes={Array.from(nodes.values())} 
                 selectedNodeId={selectedNodeId} 
                 onSelectNode={handleNodeSelect} 
               />
           ) : (
               <ChannelList
                 channels={channels}
                 selectedChannelId={selectedChannelId}
                 onSelectChannel={setSelectedChannelId}
               />
           )}
        </div>

        {/* Column 2: Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900/50 relative">
          
          {viewMode === 'analyzer' && (
            <>
              {selectedNodeId && (
                <div className="flex-none bg-blue-900/30 border-b border-blue-800 p-2 text-xs text-blue-200 flex items-center justify-between px-4">
                  <span className="flex items-center gap-2"><Filter className="w-3 h-3" /> Filtered by Node: <strong>{selectedNodeId}</strong></span>
                  <button onClick={() => setSelectedNodeId(null)} className="hover:text-white underline">Clear Filter</button>
                </div>
              )}
              <div className="flex-1 relative min-h-0">
                <PacketList 
                  packets={filteredPacketsAnalyzer} 
                  onSelect={handlePacketSelect} 
                  selectedId={selectedPacket?.ts}
                />
              </div>
            </>
          )}

          {viewMode === 'channels' && (
              selectedChannelId ? (
                <ChannelChat 
                    packets={filteredPacketsChannel}
                    onSelectPacket={handlePacketSelect}
                    channelName={channels.find(c => c.id === selectedChannelId)?.name || selectedChannelId}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                    <MessageCircle className="w-12 h-12 opacity-20 mb-4" />
                    <p>Select a channel to view messages</p>
                </div>
              )
          )}

          {viewMode === 'map' && (
             <NodeMap 
                nodes={Array.from(nodes.values())}
                selectedNodeId={selectedNodeId}
                onSelectNode={(id) => {
                    handleNodeSelect(id);
                    // Ensure we clear packet selection to show node details
                    setSelectedPacket(null);
                }}
             />
          )}
        </div>

        {/* Column 3: Details Panel */}
        <div 
          className={`
            flex-none bg-slate-800 flex flex-col transition-all duration-300 ease-in-out overflow-hidden
            ${isDetailsVisible ? 'w-[400px] border-l border-slate-700' : 'w-0 border-l-0'}
          `}
        >
          <div className="w-[400px] h-full flex flex-col">
            {showPacketDetails && selectedPacket ? (
              <PacketDetails 
                packet={selectedPacket} 
                onClose={() => setSelectedPacket(null)} 
              />
            ) : showNodeDetails && selectedNodeId ? (
               <NodeDetails 
                  node={nodes.get(selectedNodeId)!} 
                  packets={filteredPacketsAnalyzer} 
                  onClose={() => setSelectedNodeId(null)}
               />
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;