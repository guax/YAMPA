import { Packet } from '../types';
import { MOCK_PACKET_DATA } from '../constants';
import { PacketDecoder, RawPacketData } from './packetDecoder';

type PacketCallback = (packet: Packet) => void;
type StatusCallback = (status: ConnectionStatus) => void;

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export class StreamService {
  private packets: RawPacketData[] = [];
  private callbacks: PacketCallback[] = [];
  private statusCallbacks: StatusCallback[] = [];
  
  private intervalId: number | null = null;
  private currentIndex: number = 0;
  private isPaused: boolean = false;
  
  private ws: WebSocket | null = null;
  private wsUrl: string = 'ws://localhost:8080/ws';
  private isSimulationMode: boolean = false;
  private reconnectTimeoutId: number | null = null;

  constructor() {
    this.parseMockData();
  }

  private parseMockData() {
    this.packets = MOCK_PACKET_DATA.trim()
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          const fullPacket = JSON.parse(line);
          // Extract only the raw packet data for client-side decoding
          return {
            ts: fullPacket.ts,
            raw_packet: fullPacket.raw_packet,
            radio: fullPacket.radio,
            routing: fullPacket.routing,
          } as RawPacketData;
        } catch (e) {
          console.error("Failed to parse packet line:", line);
          return null;
        }
      })
      .filter((p): p is RawPacketData => p !== null)
      .sort((a, b) => a.ts - b.ts); 
  }

  public subscribe(callback: PacketCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  public subscribeStatus(callback: StatusCallback): () => void {
    this.statusCallbacks.push(callback);
    // Emit current status immediately
    callback(this.getCurrentStatus());
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter((cb) => cb !== callback);
    };
  }

  private emitStatus(status: ConnectionStatus) {
    this.statusCallbacks.forEach(cb => cb(status));
  }

  private getCurrentStatus(): ConnectionStatus {
    if (this.isSimulationMode) return 'connected'; // Simulation is always "connected" (unless paused logic handled elsewhere, but simpler this way)
    if (!this.ws) return 'disconnected';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: 
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'disconnected';
    }
  }

  public setSimulationMode(enabled: boolean) {
    if (this.isSimulationMode === enabled) return;
    
    this.stop(); // Stop current mode
    this.isSimulationMode = enabled;
    this.start(); // Start new mode
  }

  public start() {
    if (this.isSimulationMode) {
      this.startSimulation();
    } else {
      this.connectWebSocket();
    }
  }

  public stop() {
    this.stopSimulation();
    this.closeWebSocket();
  }

  public pause() {
    this.isPaused = true;
    // When paused, we stop the connection/simulation to prevent updates and attempts
    if (this.isSimulationMode) {
      this.stopSimulation();
    } else {
      this.closeWebSocket();
    }
  }

  public resume() {
    this.isPaused = false;
    // When resuming, we restart the connection/simulation
    this.start();
  }

  // --- WebSocket Logic ---

  private connectWebSocket() {
    if (this.ws) return;
    if (this.isPaused) return; // Do not connect if paused

    this.emitStatus('connecting');
    
    try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
            this.emitStatus('connected');
            if (this.reconnectTimeoutId) {
                window.clearTimeout(this.reconnectTimeoutId);
                this.reconnectTimeoutId = null;
            }
        };

        this.ws.onmessage = (event) => {
            if (this.isPaused) return;
            try {
                const rawData: RawPacketData = JSON.parse(event.data);
                PacketDecoder.decodeRawPacket(rawData).then(decodedPacket => {
                    this.emit(decodedPacket);
                });
            } catch (e) {
                console.error('Failed to parse incoming WS message:', e);
            }
        };

        this.ws.onclose = () => {
            this.emitStatus('disconnected');
            this.ws = null;
            
            // Only reconnect if not in simulation mode AND NOT PAUSED
            if (!this.isSimulationMode && !this.isPaused) {
                this.reconnectTimeoutId = window.setTimeout(() => this.connectWebSocket(), 3000);
            }
        };

        this.ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            this.emitStatus('error');
            // ws.close() will be called automatically or manually, triggering onclose
        };

    } catch (e) {
        console.error("Connection failed immediately", e);
        this.emitStatus('error');
        if (!this.isSimulationMode && !this.isPaused) {
            this.reconnectTimeoutId = window.setTimeout(() => this.connectWebSocket(), 3000);
        }
    }
  }

  private closeWebSocket() {
    if (this.reconnectTimeoutId) {
        window.clearTimeout(this.reconnectTimeoutId);
        this.reconnectTimeoutId = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect trigger during manual close
      this.ws.close();
      this.ws = null;
    }
    // Only emit disconnected if we aren't switching modes immediately 
    // (though in pause context we generally want to emit disconnected)
    if (!this.isSimulationMode) {
        this.emitStatus('disconnected');
    }
  }

  // --- Simulation Logic ---

  private startSimulation() {
    if (this.intervalId) return;
    if (this.isPaused) return;

    this.emitStatus('connected'); 

    this.intervalId = window.setInterval(() => {
      // Logic inside here just emits; pause check handled by interval clearing in this.pause()
      if (this.currentIndex >= this.packets.length) {
        this.currentIndex = 0; // Loop forever
      }

      const rawPacket = this.packets[this.currentIndex];
      
      // We clone the packet and update the timestamp to now 
      // so it feels like a live stream in the UI
      const liveRawPacket = { ...rawPacket, ts: Date.now() / 1000 };
      
      // Decode the raw packet using the client-side decoder
      PacketDecoder.decodeRawPacket(liveRawPacket).then(decodedPacket => {
        this.emit(decodedPacket);
      });
      this.currentIndex++;
    }, 1000); 
  }

  private stopSimulation() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private emit(packet: Packet) {
    this.callbacks.forEach((cb) => cb(packet));
  }
}