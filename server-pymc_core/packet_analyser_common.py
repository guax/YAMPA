#!/usr/bin/env python3

import os
import sys
import time
from typing import Any

# Add the src directory to the path so we can import pymc_core
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from common import create_radio

from pymc_core import LocalIdentity
from pymc_core.node.handlers.group_text import GroupTextHandler
from pymc_core.node.node import MeshNode
from pymc_core.protocol.constants import (
    PAYLOAD_TYPE_ACK,
    PAYLOAD_TYPE_ADVERT,
    PAYLOAD_TYPE_CONTROL,
    PAYLOAD_TYPE_GRP_TXT,
    PAYLOAD_TYPE_PATH,
    PAYLOAD_TYPE_TRACE,
    PAYLOAD_TYPE_TXT_MSG,
)
from pymc_core.protocol.utils import PAYLOAD_TYPES, ROUTE_TYPES, decode_appdata, parse_advert_payload


PUBLIC_CHANNEL_NAME = "Public"
PUBLIC_CHANNEL_SECRET = "8b3387e9c5cdea6ac9e5edbaa115cd72"

TEST_CHANNEL_NAME = "#test"
TEST_CHANNEL_SECRET = "9cd8fcf22a47333b591d96a2b848b73f"


class StaticChannelDB:
    def __init__(self, channels: list[dict[str, Any]]):
        self._channels = channels

    def get_channels(self) -> list[dict[str, Any]]:
        return list(self._channels)


class EmptyContacts:
    def __init__(self):
        self.contacts: list[Any] = []

    def get_by_name(self, _name: str):
        return None


def create_default_channel_db() -> StaticChannelDB:
    return StaticChannelDB(
        [
            {"name": PUBLIC_CHANNEL_NAME, "secret": PUBLIC_CHANNEL_SECRET},
            {"name": TEST_CHANNEL_NAME, "secret": TEST_CHANNEL_SECRET},
        ]
    )


def _format_path(pkt) -> str:
    try:
        if getattr(pkt, "path_len", 0) and getattr(pkt, "path", None) is not None:
            return bytes(pkt.path[: pkt.path_len]).hex()
        return ""
    except Exception:
        return ""


def _payload_hex(pkt) -> str:
    try:
        return pkt.get_payload().hex()
    except Exception:
        try:
            return bytes(getattr(pkt, "payload", b"")[: getattr(pkt, "payload_len", 0)]).hex()
        except Exception:
            return ""


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _decode_ack(pkt) -> dict[str, Any]:
    payload = pkt.get_payload()
    if len(payload) == 4:
        return {"crc": int.from_bytes(payload, "little")}
    return {"error": "invalid_ack_length", "payload_len": len(payload)}


def _decode_control(pkt) -> dict[str, Any]:
    payload = pkt.get_payload()
    if not payload:
        return {"error": "empty_payload"}

    ctl_type = payload[0] & 0xF0
    ctl_info: dict[str, Any] = {"control_type": f"0x{ctl_type:02X}"}

    if ctl_type == 0x80 and len(payload) >= 6:
        ctl_info["kind"] = "node_discover_req"
        ctl_info["prefix_only"] = bool(payload[0] & 0x01)
        ctl_info["filter"] = payload[1]
        ctl_info["tag"] = int.from_bytes(payload[2:6], "little")
        if len(payload) >= 10:
            ctl_info["since"] = int.from_bytes(payload[6:10], "little")
    elif ctl_type == 0x90 and len(payload) >= 6:
        ctl_info["kind"] = "node_discover_resp"
        ctl_info["node_type"] = payload[0] & 0x0F
        ctl_info["tag"] = int.from_bytes(payload[2:6], "little")
        ctl_info["pub_key"] = payload[6:].hex()
    else:
        ctl_info["kind"] = "unknown"

    return ctl_info


def _decode_advert(pkt) -> dict[str, Any]:
    try:
        parts = parse_advert_payload(pkt.get_payload())
        decoded = decode_appdata(parts["appdata"]) if "appdata" in parts else {}
        return {
            "pub_key": parts.get("pubkey", ""),
            "timestamp": _safe_int(parts.get("timestamp")),
            "appdata": decoded,
        }
    except Exception as e:
        return {"error": str(e)}


def _decode_path(pkt) -> dict[str, Any]:
    payload = pkt.get_payload()
    if len(payload) < 2:
        return {"error": "payload_too_short", "payload_len": len(payload)}
    return {
        "dest_hash": payload[0],
        "src_hash": payload[1],
        "payload_hex": payload.hex(),
    }


def _decode_group_text(pkt) -> dict[str, Any]:
    data = getattr(pkt, "decrypted", {}).get("group_text_data") if hasattr(pkt, "decrypted") else None
    if not data:
        payload = pkt.get_payload()
        channel_hash = payload[0] if len(payload) > 0 else None
        return {
            "decrypted": False,
            "channel_hash": channel_hash,
        }

    return {
        "decrypted": True,
        "channel_name": data.get("channel_name"),
        "channel_hash": data.get("channel_hash"),
        "sender_name": data.get("sender_name"),
        "text": data.get("text"),
        "full_content": data.get("full_content"),
        "message_type": data.get("message_type"),
        "timestamp": data.get("timestamp"),
        "flags": data.get("flags"),
    }


def _decode_text(pkt) -> dict[str, Any]:
    decrypted = getattr(pkt, "decrypted", {}) if hasattr(pkt, "decrypted") else {}
    if isinstance(decrypted, dict) and "text" in decrypted:
        return {"decrypted": True, "text": decrypted.get("text")}
    return {"decrypted": False}


def _decode_trace(pkt) -> dict[str, Any]:
    payload = pkt.get_payload()
    if len(payload) < 6:
        return {"error": "payload_too_short", "payload_len": len(payload)}

    try:
        tag = int.from_bytes(payload[0:4], "little")
        auth_code = int.from_bytes(payload[4:6], "little")
        return {"tag": tag, "auth_code": auth_code}
    except Exception as e:
        return {"error": str(e)}


def decode_by_type(pkt) -> dict[str, Any]:
    ptype = pkt.get_payload_type()

    if ptype == PAYLOAD_TYPE_ADVERT:
        return {"advert": _decode_advert(pkt)}
    if ptype == PAYLOAD_TYPE_GRP_TXT:
        return {"group_text": _decode_group_text(pkt)}
    if ptype == PAYLOAD_TYPE_TXT_MSG:
        return {"text": _decode_text(pkt)}
    if ptype == PAYLOAD_TYPE_ACK:
        return {"ack": _decode_ack(pkt)}
    if ptype == PAYLOAD_TYPE_CONTROL:
        return {"control": _decode_control(pkt)}
    if ptype == PAYLOAD_TYPE_PATH:
        return {"path": _decode_path(pkt)}
    if ptype == PAYLOAD_TYPE_TRACE:
        return {"trace": _decode_trace(pkt)}

    return {}


def build_packet_json(pkt) -> dict[str, Any]:
    payload_type = pkt.get_payload_type()
    route_type = pkt.get_route_type()

    return {
        "ts": time.time(),
        "raw_packet": {
            "hex": pkt.write_to().hex() if hasattr(pkt, "write_to") else "",
        },
        "packet": {
            "header": pkt.header,
            "payload_type": payload_type,
            "payload_type_name": PAYLOAD_TYPES.get(payload_type, f"UNKNOWN_{payload_type}"),
            "route_type": route_type,
            "route_type_name": ROUTE_TYPES.get(route_type, f"UNKNOWN_{route_type}"),
            "payload_len": getattr(pkt, "payload_len", None),
            "raw_len": pkt.get_raw_length() if hasattr(pkt, "get_raw_length") else None,
            "crc": pkt.get_crc() if hasattr(pkt, "get_crc") else None,
        },
        "radio": {
            "rssi": getattr(pkt, "_rssi", None),
            "snr": getattr(pkt, "_snr", None),
        },
        "routing": {
            "path_len": getattr(pkt, "path_len", None),
            "path": _format_path(pkt),
        },
        "payload": {
            "hex": _payload_hex(pkt),
        },
        "decoded": decode_by_type(pkt),
    }


def create_analyser_node(
    *,
    radio_type: str,
    serial_port: str,
    node_name: str = "PacketAnalyser",
    channel_db: StaticChannelDB | None = None,
) -> MeshNode:
    identity = LocalIdentity()

    radio = create_radio(radio_type, serial_port)
    if radio_type == "kiss-tnc":
        if not radio.connect():
            raise RuntimeError(f"KISS radio connection failed on {serial_port}")
    else:
        radio.begin()

    if channel_db is None:
        channel_db = create_default_channel_db()

    node = MeshNode(
        radio=radio,
        local_identity=identity,
        config={"node": {"name": node_name}},
        contacts=EmptyContacts(),
        channel_db=channel_db,
        event_service=None,
    )

    group_handler = GroupTextHandler(
        identity,
        node.contacts,
        lambda _msg: None,
        node.dispatcher.send_packet,
        channel_db=channel_db,
        event_service=None,
        our_node_name=node.node_name,
    )
    node.dispatcher.register_handler(PAYLOAD_TYPE_GRP_TXT, group_handler)

    return node
