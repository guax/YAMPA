import { Packet, DiscoveredNode } from './types';

export const formatPath = (path: string): string => {
  if (!path) return '';
  // Split into 2-character chunks (bytes)
  return path.match(/.{1,2}/g)?.join(' → ') || path;
};

export const extractNodeFromPacket = (packet: Packet): Partial<DiscoveredNode> | null => {
  const { decoded, ts, radio } = packet;
  
  // Case 1: Advert Packet (Rich info)
  if (decoded.advert && decoded.advert.appdata.node_name) {
    return {
      id: decoded.advert.appdata.node_name,
      name: decoded.advert.appdata.node_name,
      pub_key: decoded.advert.pub_key,
      latitude: decoded.advert.appdata.latitude,
      longitude: decoded.advert.appdata.longitude,
      last_seen: ts,
      last_rssi: radio.rssi,
      last_snr: radio.snr
    };
  }

  // Case 2: Group Text (Sender info)
  if (decoded.group_text && decoded.group_text.sender_name) {
    return {
      id: decoded.group_text.sender_name,
      name: decoded.group_text.sender_name,
      last_seen: ts,
      last_rssi: radio.rssi,
      last_snr: radio.snr
    };
  }

  return null;
};