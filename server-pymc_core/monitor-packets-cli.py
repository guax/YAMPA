#!/usr/bin/env python3

import argparse
import asyncio
import json
import sys

from packet_analyser_common import build_packet_json, create_analyser_node


async def run_analyser(radio_type: str, serial_port: str):
    node = create_analyser_node(radio_type=radio_type, serial_port=serial_port)

    async def on_packet(pkt):
        out = build_packet_json(pkt)
        sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
        sys.stdout.flush()

    node.dispatcher.set_packet_received_callback(on_packet)

    await node.start()


def main():
    parser = argparse.ArgumentParser(
        description="Packet analyser: print JSON lines for all received packets, with best-effort decoding"
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

    args = parser.parse_args()

    try:
        asyncio.run(run_analyser(args.radio_type, args.serial_port))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
