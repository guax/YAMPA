export interface RawPacket {
  hex: string;
}

export interface PacketHeader {
  header: number;
  payload_type: number;
  payload_type_name: string;
  route_type: number;
  route_type_name: string;
  payload_len: number;
  raw_len: number;
  crc: number;
}

export interface RadioStats {
  rssi: number;
  snr: number;
}

export interface RoutingInfo {
  path_len: number;
  path: string;
}

export interface PacketPayload {
  hex: string;
}

export interface DecodedAdvert {
  pub_key: string;
  timestamp: number;
  appdata: {
    flags: number;
    latitude?: number;
    longitude?: number;
    node_name?: string;
  };
}

export interface DecodedGroupText {
  decrypted: boolean;
  channel_name?: string;
  channel_hash: number;
  sender_name?: string;
  text?: string;
  full_content?: string;
  message_type?: string;
  timestamp?: number;
  flags?: number;
}

export interface DecodedPath {
  dest_hash: number;
  src_hash: number;
  payload_hex: string;
}

export interface Decoded {
  group_text?: DecodedGroupText;
  advert?: DecodedAdvert;
  text?: { decrypted: boolean };
  path?: DecodedPath;
}

export interface Packet {
  ts: number;
  raw_packet: RawPacket;
  packet: PacketHeader;
  radio: RadioStats;
  routing: RoutingInfo;
  payload: PacketPayload;
  decoded: Decoded;
}

export interface DiscoveredNode {
  id: string; // usually node_name
  name: string;
  pub_key?: string;
  last_seen: number; // timestamp
  last_rssi: number;
  last_snr: number;
  latitude?: number;
  longitude?: number;
  packet_count: number;
  is_router?: boolean;
}
