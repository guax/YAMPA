

# YAMPA

YAMPA is Yet Another Meshcore Packet Analyser.

![YAMPA packet analyzer](screenshots/main.png)

This repository contains:

- A React frontend UI.
- A Python WebSocket server implementation in `server-pymc_core/`.

The frontend expects a WebSocket endpoint that streams packet events as JSON.

## Server (WebSocket packet stream)

Both server implementations serve the same WebSocket endpoint. **The server and frontend do not need to run on the same machine.**

- **URL:** `ws://<host>:<port>/ws`
- **Default:** `ws://localhost:8080/ws`

### Option A: pyMC_Core Server (`server.py`)

For Linux hosts with a supported LoRa radio directly attached (Waveshare, uConsole, etc.) or a KISS TNC. Decodes packets server-side.

```bash
python3 server-pymc_core/server.py --radio-type uconsole --host 0.0.0.0 --port 8080
python3 server-pymc_core/server.py --radio-type kiss-tnc --serial-port /dev/ttyUSB0
```

### Option B: MeshCore Companion Bridge (`server_companion.py`)

For devices flashed with **MeshCore USB Serial Companion** firmware (e.g. Heltec ESP32+SX1262). Receives raw packets over USB serial via the `meshcore` Python library and forwards them to the frontend, which decodes them client-side.

1. Flash your device with MeshCore USB Serial Companion firmware from [flasher.meshcore.co.uk](https://flasher.meshcore.co.uk)
2. Configure the correct frequency and radio settings for your region via the [MeshCore web app](https://meshcore.co.uk) before running the bridge.
3. Install the meshcore library in the project venv:
   ```bash
   pip install meshcore
   ```
4. Run the bridge:
   ```bash
   python3 server-pymc_core/server_companion.py --serial-port /dev/tty.usbserial-0001
   ```

| Flag | Default | Description |
|------|---------|-------------|
| `--serial-port` | `/dev/ttyUSB0` | Serial port for the companion device |
| `--host` | `localhost` | WebSocket server bind address |
| `--port` | `8080` | WebSocket server port |

## Frontend

### Run locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Connecting the frontend to a remote server

By default, the frontend connects to `ws://localhost:8080/ws`.

If the server runs on a different machine (for example, the server on a Raspberry Pi and the frontend on your laptop), you must proxy the WebSocket endpoint so the browser can reach it.

### Option A: SSH tunnel (quick dev setup)

Forward your local port `8080` to the remote server’s `8080`:

```bash
ssh -N -L 8080:localhost:8080 pi@<server-host>
```

Then keep the frontend pointing at `ws://localhost:8080/ws`.

### Option B: Nginx reverse proxy (recommended)

Terminate HTTP(S) at Nginx and proxy the WebSocket upgrade to the server. Example:

```nginx
server {
  listen 80;
  server_name yampa.example.com;

  location /ws {
    proxy_pass http://127.0.0.1:8080/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```

From the browser you would then connect to `ws://yampa.example.com/ws` (or `wss://...` if served over TLS).

## Screenshots

### Channels

![YAMPA channels view](screenshots/channel-view.png)

### Map

![YAMPA map view](screenshots/map-view.png)

## License

This project is licensed under the GNU General Public License v3.0 (GPLv3). See [LICENSE](LICENSE).
