#!/usr/bin/env python3

"""
MeshCore Companion Bridge — connects to a MeshCore USB Serial Companion device
and forwards raw radio packets to YAMPA's frontend via WebSocket.

Usage:
    python3 server_companion.py --serial-port /dev/tty.usbserial-0001
"""

import argparse
import asyncio
import json
import logging
import time
from typing import Set

import websockets
from websockets.server import WebSocketServerProtocol

from meshcore import MeshCore, EventType

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("companion_bridge")


async def run_server(serial_port: str, host: str, port: int):
    clients: Set[WebSocketServerProtocol] = set()

    async def broadcast(packet_json: dict):
        if not clients:
            return

        msg = json.dumps(packet_json, ensure_ascii=False)

        to_remove = []
        for ws in clients:
            try:
                await ws.send(msg)
            except Exception as e:
                peer = getattr(ws, "remote_address", None)
                logger.warning(f"WS send failed to {peer}: {e}")
                to_remove.append(ws)

        for ws in to_remove:
            clients.discard(ws)

    async def on_rx_log_data(event):
        payload = event.payload
        packet_json = {
            "ts": time.time(),
            "raw_packet": {"hex": payload.get("payload", "")},
            "radio": {
                "rssi": payload["rssi"],
                "snr": payload["snr"],
            },
        }
        logger.info(
            f"RX packet: {len(payload['raw_hex']) // 2} bytes, "
            f"RSSI={payload['rssi']}, SNR={payload['snr']}"
        )
        await broadcast(packet_json)

    logger.info(f"Connecting to MeshCore companion on {serial_port}...")
    mc = await MeshCore.create_serial(port=serial_port)
    logger.info("MeshCore companion connected")

    mc.subscribe(EventType.RX_LOG_DATA, on_rx_log_data)

    async def ws_handler(ws: WebSocketServerProtocol):
        peer = getattr(ws, "remote_address", None)
        clients.add(ws)
        logger.info(f"WS client connected: {peer} (clients={len(clients)})")
        try:
            async for _message in ws:
                pass
        finally:
            clients.discard(ws)
            logger.info(f"WS client disconnected: {peer} (clients={len(clients)})")

    async def ws_router(ws: WebSocketServerProtocol):
        path = getattr(ws, "path", None) or getattr(
            getattr(ws, "request", None), "path", None
        )
        if path != "/ws":
            peer = getattr(ws, "remote_address", None)
            logger.warning(f"WS rejected client {peer} with invalid path: {path}")
            await ws.close(code=1008, reason="Invalid path")
            return
        await ws_handler(ws)

    logger.info(f"Starting WebSocket server on ws://{host}:{port}/ws")
    ws_server = await websockets.serve(ws_router, host, port)
    logger.info("WebSocket server started")

    try:
        while mc.is_connected:
            await asyncio.sleep(1)
    finally:
        logger.info("Shutting down...")
        ws_server.close()
        await ws_server.wait_closed()
        await mc.disconnect()


def main():
    parser = argparse.ArgumentParser(
        description="MeshCore Companion Bridge — forwards raw radio packets to YAMPA via WebSocket"
    )
    parser.add_argument(
        "--serial-port",
        default="/dev/ttyUSB0",
        help="Serial port for MeshCore companion device (default: /dev/ttyUSB0)",
    )
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=8080)

    args = parser.parse_args()

    try:
        asyncio.run(run_server(args.serial_port, args.host, args.port))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
