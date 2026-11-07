#!/usr/bin/env python3
"""Ask the Wanas ST-340 for registers 0-7 straight from a computer through a USB-RS485 stick.

Why: when the ESP gets no answers, this tells whether the controller and cable work
without any ESP or transceiver module of ours in the way.

Usage:
  python3 tools/modbus_probe.py [PORT]           # 19200 8E1 address 1, then other common settings
  python3 tools/modbus_probe.py [PORT] --sniff   # only listen for 10 s and show what arrives
PORT defaults to the only USB serial port found. Needs pyserial (pip install pyserial).
"""
import glob
import sys
import time

import serial

ADDRESS, REGISTER_COUNT = 1, 8
DEFAULT = (19200, "E")
FALLBACKS = [(9600, "E"), (19200, "N"), (9600, "N"), (38400, "E")]
PARITY = {"E": serial.PARITY_EVEN, "N": serial.PARITY_NONE}
NAMES = ["Wydatek nawiewu", "Wydatek wywiewu", "Bieg nawiewu", "Bieg wywiewu",
         "Temp. zewnętrzna", "Temp. wyrzutowa", "Temp. nawiewowa", "Temp. pomieszczenia"]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    port = args[0] if args else find_port()
    with serial.Serial(port, timeout=0.05) as link:
        if "--sniff" in sys.argv:
            sniff(link, *DEFAULT)
            return
        print(f"Port: {port}\n")
        if any(probe(link, *DEFAULT) for _ in range(3)):
            print("\nWYNIK: sterownik odpowiada. Sterownik i kabel są OK, winny jest moduł albo ESP.")
            return
        print(f"\nBrak odpowiedzi na {DEFAULT[0]} 8{DEFAULT[1]}1. Sprawdzam inne ustawienia...\n")
        for baud, parity in FALLBACKS:
            if probe(link, baud, parity):
                print(f"\nWYNIK: sterownik odpowiada, ale na {baud} 8{parity}1. Popraw ustawienia w menu albo w YAML.")
                return
    print("\nWYNIK: brak odpowiedzi. Zamień A z B na przejściówce i uruchom ponownie.")
    print("Jeśli dalej nic: sprawdź w menu Modbus (włączony, adres 1) i zworkę nad MODBUS 2.")


def find_port():
    ports = sorted(set(glob.glob("/dev/cu.usbserial*") + glob.glob("/dev/cu.wchusbserial*")
                       + glob.glob("/dev/ttyUSB*")))
    if len(ports) != 1:
        sys.exit(f"Nie wiem, którego portu użyć: {ports or 'brak portów USB'}. Podaj go jako argument.")
    return ports[0]


def configure(link, baud, parity):
    link.baudrate, link.parity = baud, PARITY[parity]


def probe(link, baud, parity):
    """Send one read request; return True when a valid answer comes back."""
    request = with_crc(bytes([ADDRESS, 0x03, 0, 0, 0, REGISTER_COUNT]))
    configure(link, baud, parity)
    idle = listen(link, 0.5)
    link.write(request)
    link.flush()
    reply = listen(link, 1.0)
    print(f"[{baud} 8{parity}1] cisza przed: {len(idle)} B   wysłane: {request.hex(' ')}")
    print(f"               odebrane: {reply.hex(' ') or '(nic)'}")
    frame = find_frame(reply)
    if frame is None:
        return False
    if frame[1] & 0x80:
        print(f"               wyjątek Modbus {frame[2]:#04x} (sterownik żyje, ale odrzucił zapytanie)")
        return True
    show_registers(frame[3:3 + 2 * REGISTER_COUNT])
    return True


def listen(link, seconds):
    data, deadline = b"", time.monotonic() + seconds
    while time.monotonic() < deadline:
        data += link.read(256)
    return data


def find_frame(data):
    """Find a CRC-valid answer from ADDRESS, skipping any echo of our own request or line noise."""
    shapes = [(bytes([ADDRESS, 0x03, 2 * REGISTER_COUNT]), 5 + 2 * REGISTER_COUNT),
              (bytes([ADDRESS, 0x83]), 5)]
    for i in range(len(data)):
        for head, length in shapes:
            frame = data[i:i + length]
            if frame.startswith(head) and len(frame) == length and with_crc(frame[:-2]) == frame:
                return frame
    return None


def show_registers(payload):
    # The ST-340 sends the low byte first (see WANAS_SWAP_BYTES in wanas_modbus.h).
    for n, name in enumerate(NAMES):
        lo, hi = payload[2 * n], payload[2 * n + 1]
        value = lo | hi << 8
        shown = f"{to_signed(value) / 10:.1f} °C" if name.startswith("Temp") else str(value)
        print(f"               {n}: {name:<20} {shown:>10}   (surowo {lo:02x} {hi:02x})")


def sniff(link, baud, parity):
    print(f"Nasłuch {link.port} {baud} 8{parity}1 przez 10 s...")
    configure(link, baud, parity)
    start = time.monotonic()
    while time.monotonic() - start < 10:
        chunk = link.read(256)
        if chunk:
            print(f"{time.monotonic() - start:6.3f}s  {chunk.hex(' ')}")


def to_signed(value):
    return value - 0x10000 if value & 0x8000 else value


def with_crc(body):
    crc = 0xFFFF
    for byte in body:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ 0xA001 if crc & 1 else crc >> 1
    return bytes(body) + bytes([crc & 0xFF, crc >> 8])


if __name__ == "__main__":
    main()
