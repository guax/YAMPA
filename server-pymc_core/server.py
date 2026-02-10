#!/usr/bin/env python3

import argparse
import asyncio
import json
import logging
from typing import Set

import websockets
from websockets.server import WebSocketServerProtocol

from packet_analyser_common import build_packet_json, create_analyser_node


logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("packet_analyser_server")


async def run_server(radio_type: str, serial_port: str, host: str, port: int):
    node = create_analyser_node(
        radio_type=radio_type,
        serial_port=serial_port,
        node_name="PacketAnalyserServer",
    )

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

    async def on_packet(pkt):
        await broadcast(build_packet_json(pkt))

    node.dispatcher.set_packet_received_callback(on_packet)

    async def ws_handler(ws: WebSocketServerProtocol):
        peer = getattr(ws, "remote_address", None)
        clients.add(ws)
        logger.info(f"WS client connected: {peer} (clients={len(clients)})")
        try:
            async for _message in ws:
                # Client doesn't need to send anything; ignore messages.
                pass
        finally:
            clients.discard(ws)
            logger.info(f"WS client disconnected: {peer} (clients={len(clients)})")

    async def ws_router(ws: WebSocketServerProtocol):
        path = getattr(ws, "path", None)
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
        await node.start()
    finally:
        logger.info("Shutting down WebSocket server")
        ws_server.close()
        await ws_server.wait_closed()


def main():
    parser = argparse.ArgumentParser(
        description="WebSocket server for Meshcore Packet Visualizer (ws://localhost:8080/ws)"
    )
    parser.add_argument(
        "--radio-type",
        choices=["waveshare", "uconsole", "meshadv-mini", "kiss-tnc"],
        default="uconsole",
        help="Radio hardware type (default: uconsole)",
    )
    parser.add_argument(
        "--serial-port",
        default="/dev/ttyUSB0",
        help="Serial port for KISS TNC (default: /dev/ttyUSB0)",
    )
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=8080)

    args = parser.parse_args()

    try:
        asyncio.run(run_server(args.radio_type, args.serial_port, args.host, args.port))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
