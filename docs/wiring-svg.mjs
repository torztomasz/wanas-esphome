// Builds docs/wiring.svg: ESP32 DevKit -> MAX3485 module (EN pin) -> Wanas ST-340 "Modbus 1".
// Usage: node docs/wiring-svg.mjs docs/wiring.svg
import { writeFileSync } from "node:fs";

const out = [];
const add = (s) => out.push(s);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (x, y, s, cls, anchor = "start") =>
  add(`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}" dominant-baseline="middle">${esc(s)}</text>`);

const W = { tx: "#e0a800", rx: "#2fa84f", pwr: "#e5484d", en: "#a855f7", a: "#3b82f6", b: "#f97316" };

add(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500" font-family="system-ui,-apple-system,Segoe UI,sans-serif">
<style>
.t{font:700 14px system-ui,sans-serif;fill:#0f172a}.s{font:12px system-ui,sans-serif;fill:#475569}
.l{font:600 11px ui-monospace,Menlo,monospace;fill:#f1f5f9}.d{font:400 11px ui-monospace,Menlo,monospace;fill:#94a3b8}
.w{fill:none;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.g{stroke:#111827}
@media (prefers-color-scheme:dark){.t{fill:#f1f5f9}.s{fill:#94a3b8}.g{stroke:#e5e7eb}}
</style>`);

// Pass 1: boards
text(30, 16, "ESP32 DevKit (ESP-WROOM-32)", "t");
add(`<rect x="30" y="30" width="165" height="410" rx="8" fill="#1d2f52"/>
<rect x="62" y="40" width="100" height="70" rx="3" fill="#b8c0cc"/>
<path d="M75 48h12v10h12v-10h12v10h12v-10h12" fill="none" stroke="#64748b" stroke-width="2"/>
<text x="112" y="88" text-anchor="middle" style="font:700 10px ui-monospace,monospace;fill:#1e293b">ESP-WROOM-32</text>
<rect x="92" y="420" width="42" height="26" rx="6" fill="#9ca3af"/>`);
text(113, 466, "USB-C → zasilacz 5 V", "s", "middle");

text(292, 176, "Moduł MAX3485 3,3 V", "t");
text(292, 194, "„RS485 V2.01”, z pinem EN", "s");
add(`<rect x="290" y="205" width="150" height="135" rx="6" fill="#1e5fae"/>
<rect x="345" y="250" width="44" height="36" rx="3" fill="#111827"/>
<text x="367" y="268" text-anchor="middle" dominant-baseline="middle" style="font:600 9px ui-monospace,monospace;fill:#e5e7eb">3485</text>`);

text(580, 16, "Płyta w centrali Wanas", "t");
text(580, 34, "sterownik ST-340, lewa krawędź", "s");
add(`<rect x="580" y="45" width="210" height="440" rx="6" fill="#2e3a2f"/>
<rect x="580" y="45" width="40" height="440" fill="#16a34a" opacity=".55"/>`);

// Pass 2: pins
const espRight = ["D23","D22","TX0","RX0","D21","D19","D18","D5","TX2 (17)","RX2 (16)","D4","D2","D15","GND","3V3"];
const espUsed = new Set(["TX2 (17)","RX2 (16)","D4","GND","3V3"]);
const espY = {};
espRight.forEach((n, i) => {
  const y = 135 + i * 19; espY[n] = y; const on = espUsed.has(n);
  add(`<circle cx="180" cy="${y}" r="5" fill="${on ? "#d4a017" : "#475569"}" stroke="#0f172a" stroke-width="1.5"/>`);
  text(170, y, n, on ? "l" : "d", "end");
});

const rsLeft = { EN: 222, VCC: 246, RXD: 270, TXD: 294, GND: 318 };
const rsRight = { GND: 240, A: 264, B: 288 };
for (const [n, y] of Object.entries(rsLeft)) { add(`<rect x="291" y="${y-5}" width="10" height="10" fill="#d4a017"/>`); text(308, y, n, "l"); }
for (const [n, y] of Object.entries(rsRight)) { add(`<rect x="429" y="${y-5}" width="10" height="10" fill="#d4a017"/>`); text(422, y, n, "l", "end"); }

const groups = [["DISP (panel)",["GND","+","B","A"],false],["Modbus 1",["GND","B","A"],true],["Modbus 2",["GND","B","A"],false],["TECH RS",["RX","TX","+","GND"],false]];
const wanasY = {}; let y = 142;
for (const [g, pins, on] of groups) {
  const y0 = y;
  for (const p of pins) {
    add(`<rect x="586" y="${y-9}" width="28" height="18" rx="2" fill="${on ? "#e5e7eb" : "#6b7280"}" stroke="#1f2937"/><line x1="594" y1="${y+5}" x2="606" y2="${y-5}" stroke="#374151" stroke-width="2"/>`);
    text(624, y, p, on ? "l" : "d"); if (on) wanasY[p] = y; y += 22;
  }
  text(662, (y0 + y - 22) / 2, g, on ? "l" : "d"); y += 12;
}
add(`<rect x="573" y="${wanasY.GND-13}" width="180" height="70" rx="8" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 4"/>`);

// Pass 3: wires, each in its own vertical channel so crossings stay readable
const wire = (x1, y1, cx, x2, y2, color) => {
  const cls = color ? "w" : "w g", style = color ? ` style="stroke:${color}"` : "";
  add(`<path d="M${x1} ${y1} H${cx} V${y2} H${x2}" class="${cls}"${style}/>`);
};
wire(185, espY["D4"], 210, 291, rsLeft.EN, W.en);
wire(185, espY["3V3"], 225, 291, rsLeft.VCC, W.pwr);
wire(185, espY["RX2 (16)"], 240, 291, rsLeft.RXD, W.rx);
wire(185, espY["TX2 (17)"], 255, 291, rsLeft.TXD, W.tx);
wire(185, espY["GND"], 270, 291, rsLeft.GND, null);
wire(439, rsRight.GND, 480, 590, wanasY.GND, null);
wire(439, rsRight.A, 510, 590, wanasY.A, W.a);
wire(439, rsRight.B, 540, 590, wanasY.B, W.b);
text(510, 345, "skrętka, np. wolna", "s", "middle");
text(510, 361, "para z kabla UTP", "s", "middle");

add("</svg>");
writeFileSync(process.argv[2], out.join("\n") + "\n");
