import { Packet, Decoded, DecodedAdvert, DecodedGroupText, DecodedPath } from '../types';

// Import meshcore-decoder (will be available after npm install)
// @ts-ignore - meshcore-decoder may not have TypeScript definitions
import { MeshCorePacketDecoder, RouteType, PayloadType, Utils } from '@michaelhart/meshcore-decoder';

export interface RawPacketData {
  ts: number;
  raw_packet: {
    hex: string;
  };
  radio?: {
    rssi?: number;
    snr?: number;
  };
  routing?: {
    path_len?: number;
    path?: string;
  };
}

export class PacketDecoder {
  // Channel secrets for decryption
  private static CHANNELS: Record<string, {secret: string, hash: string}> = this.loadChannels();

  private static loadChannels(): Record<string, {secret: string, hash: string}> {
    try {
      const stored = localStorage.getItem('meshcore_channels');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load channels from localStorage:', e);
    }
    return {
      'Public': {secret: '8b3387e9c5cdea6ac9e5edbaa115cd72', hash: '11'},
      '#test': {secret: '9cd8fcf22a47333b591d96a2b848b73f', hash: 'd9'}
    };
  }

  private static saveChannels() {
    try {
      localStorage.setItem('meshcore_channels', JSON.stringify(this.CHANNELS));
    } catch (e) {
      console.warn('Failed to save channels to localStorage:', e);
    }
  }

  public static getRegisteredChannels(): Array<{name: string; secret: string; hash: string}> {
    return Object.entries(this.CHANNELS).map(([name, v]) => ({ name, secret: v.secret, hash: v.hash }));
  }

  public static getChannelSecret(channelName: string): string | null {
    return this.CHANNELS[channelName]?.secret ?? null;
  }

  public static removeChannel(channelName: string) {
    if (channelName === 'Public') return;
    delete this.CHANNELS[channelName];
    this.saveChannels();
  }

  public static async addHashChannel(channelName: string) {
    const channelSecret = await this.calculateChannelSecretFromName(channelName);
    const channelHash = await this.calculateChannelHashFromSecret(channelSecret);
    this.CHANNELS[channelName] = {secret: channelSecret, hash: channelHash};
    this.saveChannels();
  }

  public static async addPrivateChannel(channelName: string, channelSecret: string) {
    const channelHash = await this.calculateChannelHashFromSecret(channelSecret);
    this.CHANNELS[channelName] = {secret: channelSecret, hash: channelHash};
    this.saveChannels();
  }

  /**
   * Decode a raw packet using meshcore-decoder
   */
  public static async decodeRawPacket(rawData: RawPacketData): Promise<Packet> {
    const { raw_packet, radio = {}, routing = {}, ts } = rawData;
    
    try {
      // Create key store with channel secrets for decryption
      const keyStore = MeshCorePacketDecoder.createKeyStore({
        channelSecrets: Object.values(this.CHANNELS).map(c => c.secret)
      });
      
      // Decode the packet using meshcore-decoder with decryption
      const decoded = MeshCorePacketDecoder.decode(raw_packet.hex, {
        keyStore
      });
      
      // Transform the decoded data to match our Packet interface
      return {
        ts,
        raw_packet: raw_packet,
        packet: {
          header: this.calculateHeader(decoded.routeType, decoded.payloadType, decoded.payloadVersion),
          payload_type: decoded.payloadType,
          payload_type_name: Utils.getPayloadTypeName(decoded.payloadType),
          route_type: decoded.routeType,
          route_type_name: Utils.getRouteTypeName(decoded.routeType),
          payload_len: decoded.payload.raw.length / 2,
          raw_len: decoded.totalBytes,
          crc: 0, // Not provided by meshcore-decoder
        },
        radio: {
          rssi: radio.rssi || 0,
          snr: radio.snr || 0,
        },
        routing: {
          path_len: decoded.pathLength,
          path: decoded.path ? decoded.path.join('') : '',
        },
        payload: {
          hex: decoded.payload.raw,
        },
        decoded: await this.transformDecodedData(decoded),
      };
    } catch (error) {
      console.error('Failed to decode packet:', error);
      
      // Return a basic packet structure if decoding fails
      return {
        ts,
        raw_packet: raw_packet,
        packet: {
          header: 0,
          payload_type: 0,
          payload_type_name: 'UNKNOWN',
          route_type: 0,
          route_type_name: 'UNKNOWN',
          payload_len: 0,
          raw_len: raw_packet.hex.length / 2,
          crc: 0,
        },
        radio: {
          rssi: radio.rssi || 0,
          snr: radio.snr || 0,
        },
        routing: {
          path_len: routing.path_len || 0,
          path: routing.path || '',
        },
        payload: {
          hex: '',
        },
        decoded: {},
      };
    }
  }

  /**
   * Transform decoded data to match our TypeScript interfaces
   */
  private static async transformDecodedData(decoded: any): Promise<Decoded> {
    const result: Decoded = {};

    if (decoded.payload?.decoded) {
      const payload = decoded.payload.decoded;

      if (payload.type === 4) { // ADVERT
        result.advert = {
          pub_key: payload.publicKey || '',
          timestamp: payload.timestamp || 0,
          appdata: {
            flags: payload.appData?.flags || 0,
            latitude: payload.appData?.location?.latitude,
            longitude: payload.appData?.location?.longitude,
            node_name: payload.appData?.name,
          },
        } as DecodedAdvert;
      }

      if (payload.type === 5) { // GROUP_TEXT
        const decrypted = !!payload.decrypted;
        let channelName;
        if (decrypted && payload.channelHash === "11") {
          channelName = "Public";
        } else {
          channelName = await this.getChannelName(payload.channelHash);
        }
        
        result.group_text = {
          decrypted: decrypted,
          channel_name: channelName,
          channel_hash: payload.channelHash,
          sender_name: payload.decrypted?.sender,
          text: payload.decrypted?.message,
          full_content: payload.decrypted?.message,
          message_type: 'plain_text',
          timestamp: payload.decrypted?.timestamp,
          flags: payload.decrypted?.flags || 0,
        } as DecodedGroupText;
      }

      if (payload.type === 2) { // TEXT_MSG
        result.text = {
          decrypted: !!payload.decrypted,
        };
      }

      if (payload.type === 8) { // PATH
        result.path = {
          dest_hash: parseInt(payload.destinationHash, 16) || 0,
          src_hash: parseInt(payload.sourceHash, 16) || 0,
          payload_hex: payload.extraData || '',
        } as DecodedPath;
      }
    }

    return result;
  }

  /**
   * Calculate header byte from route type, payload type, and version
   */
  private static calculateHeader(routeType: number, payloadType: number, payloadVersion: number): number {
    return (payloadVersion << 6) | (payloadType << 2) | routeType;
  }

  private static async calculateChannelHashFromSecret(hex: string): Promise<string> {
    if (hex.length % 2 !== 0) {
      throw new Error('Invalid hex string');
    }

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);

    return Array.from(new Uint8Array(hashBuffer.slice(0, 1)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private static async calculateChannelSecretFromName(channelName: string): Promise<string> {
    const encodedChannelName = new TextEncoder().encode(channelName);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encodedChannelName);

    return Array.from(new Uint8Array(hashBuffer.slice(0, 16))) // We only need the first 16 bytes
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Get channel name from hash using known channels
   */
  private static async getChannelName(channelHash: string): Promise<string> {
    let channelName;
    Object.values(this.CHANNELS).forEach((channel, index) => {
      if (channel.hash === channelHash.toLowerCase()) {
        channelName = Object.keys(this.CHANNELS)[index];
      }
    });
    
    return channelName || ('Unknown ' + channelHash);
  }
}
