# Server Implementation Guide

The **Meshcore Packet Visualizer** expects a WebSocket connection to receive real-time packet data.

This directory contains a version of this endpoint implemented using [pyMC_Core](https://github.com/rightup/pyMC_core). This allows the server to run on Raspberry Pies or any other linux host with a supported LoRa chip.

## Connection Details

*   **URL**: `ws://localhost:8080/ws`
*   **Protocol**: Standard WebSocket (RFC 6455)

The application attempts to connect immediately upon loading. If the connection fails or closes, it will automatically attempt to reconnect every 3 seconds.

## Data Format

The server should send messages as a JSON string. Each message represents a single packet event.

### Packet Structure

The JSON object must match the `Packet` interface defined in `types.ts`.

```typescript
interface Packet {
  ts: number;         // Timestamp (Epoch seconds, float)
  raw_packet: {
    hex: string;      // Raw hex string of the packet
  };
  packet: {
    header: number;
    payload_type: number;
    payload_type_name: string; // e.g., "GRP_TXT", "ADVERT", "RESPONSE"
    route_type: number;
    route_type_name: string;
    payload_len: number;
    raw_len: number;
    crc: number;
  };
  radio: {
    rssi: number;     // Signal strength in dBm
    snr: number;      // Signal to Noise Ratio in dB
  };
  routing: {
    path_len: number;
    path: string;     // Hex string of the routing path
  };
  payload: {
    hex: string;      // Payload content in hex
  };
  decoded: {
    // Optional fields depending on packet type
    group_text?: {
      decrypted: boolean;
      sender_name?: string;
      text?: string;
      channel_name?: string;
      // ... other fields
    };
    advert?: {
      pub_key: string;
      appdata: {
        node_name?: string;
        latitude?: number;
        longitude?: number;
        // ... other fields
      };
    };
    // ... other decoded types
  };
}
```

### Example Payload

```json
{
  "ts": 1770665718.76756,
  "raw_packet": {
    "hex": "1518d063cc1fcaf534f2f97f11d434f2ca1fcc45403b01dd33c4d910933a794c4fd52ded9c1113528fc34816722e00c3bed1b0053762c455acc04409c6bf53c34ad4eb12ae7ba768db112188f4"
  },
  "packet": {
    "header": 21,
    "payload_type": 5,
    "payload_type_name": "GRP_TXT",
    "route_type": 1,
    "route_type_name": "FLOOD",
    "payload_len": 51,
    "raw_len": 77,
    "crc": 1943057961
  },
  "radio": {
    "rssi": -112,
    "snr": -8.5
  },
  "routing": {
    "path_len": 24,
    "path": "d063cc1fcaf534f2f97f11d434f2ca1fcc45403b01dd33c4"
  },
  "payload": {
    "hex": "d910933a794c4fd52ded9c1113528fc34816722e00c3bed1b0053762c455acc04409c6bf53c34ad4eb12ae7ba768db112188f4"
  },
  "decoded": {
    "group_text": {
      "decrypted": false,
      "channel_hash": 217
    }
  }
}
```

## Implementation Tips

1.  **Broadcasting**: When a new packet arrives at your mesh node/gateway, decode it into this JSON structure and broadcast it to all connected WebSocket clients.
2.  **Mocking**: You can use the `mock_data.txt` content (if available) to test your server implementation by replaying those lines.
