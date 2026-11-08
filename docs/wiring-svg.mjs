// Builds docs/wiring.svg: ESP32 DevKit -> MAX485 module (HW-097) -> Wanas ST-340 "Modbus 2",
// plus power from the board's "DC 24V" output through a 24 V -> USB step-down.
// Usage: node docs/wiring-svg.mjs docs/wiring.svg
import { writeFileSync } from "node:fs";

const out = [];
const add = (s) => out.push(s);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (x, y, s, cls, anchor = "start") =>
  add(`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}" dominant-baseline="middle">${esc(s)}</text>`);

const W = { tx: "#e0a800", rx: "#2fa84f", pwr: "#e5484d", dir: "#a855f7", a: "#3b82f6", b: "#f97316" };
// Everything sits 30px down so the ESP-to-Wanas GND wire can run above the boards without crossing A/B.
const TOP = 30;
const H = 650;

add(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 ${H + TOP}" width="800" height="${H + TOP}" font-family="system-ui,-apple-system,Segoe UI,sans-serif">
<style>
.t{font:700 14px system-ui,sans-serif;fill:#0f172a}.s{font:12px system-ui,sans-serif;fill:#475569}
.l{font:600 11px ui-monospace,Menlo,monospace;fill:#f1f5f9}.d{font:400 11px ui-monospace,Menlo,monospace;fill:#94a3b8}
.w{fill:none;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.g{stroke:#111827}
@media (prefers-color-scheme:dark){.t{fill:#f1f5f9}.s{fill:#94a3b8}.g{stroke:#e5e7eb}}
</style>
<g transform="translate(0 ${TOP})">`);

// Pass 1: boards
text(30, 16, "ESP32 DevKit 30-pin (ESP-WROOM-32)", "t");
add(`<rect x="30" y="30" width="165" height="410" rx="8" fill="#1d2f52"/>
<rect x="62" y="40" width="100" height="70" rx="3" fill="#b8c0cc"/>
<path d="M75 48h12v10h12v-10h12v10h12v-10h12" fill="none" stroke="#64748b" stroke-width="2"/>
<text x="112" y="88" text-anchor="middle" style="font:700 10px ui-monospace,monospace;fill:#1e293b">ESP-WROOM-32</text>
<rect x="92" y="420" width="42" height="26" rx="6" fill="#9ca3af"/>`);

text(320, 190, "Moduł MAX485 (HW-097)", "t");
text(320, 208, "kierunek sterowany z ESP (DE/RE)", "s");
add(`<rect x="320" y="225" width="150" height="170" rx="6" fill="#1e3a8a"/>
<rect x="373" y="290" width="44" height="36" rx="3" fill="#111827"/>
<text x="395" y="308" text-anchor="middle" dominant-baseline="middle" style="font:600 9px ui-monospace,monospace;fill:#e5e7eb">485</text>
<rect x="446" y="330" width="30" height="46" rx="3" fill="#16a34a"/>`);
text(320, 412, "VCC i GND są w drugim rzędzie", "s");
text(320, 428, "pinów, przy zielonym zacisku", "s");

text(320, 500, "Przetwornica 24 V → USB", "t");
text(320, 518, "wejście 9–36 V, wyjście stałe 5 V", "s");
add(`<rect x="320" y="532" width="150" height="66" rx="6" fill="#334155"/>
<rect x="312" y="553" width="18" height="24" rx="2" fill="#9ca3af" stroke="#1f2937"/>
<circle cx="372" cy="565" r="16" fill="#111827"/><circle cx="372" cy="565" r="9" fill="none" stroke="#b45309" stroke-width="3"/>
<rect x="446" y="540" width="30" height="50" rx="3" fill="#16a34a"/>`);
text(320, 616, "Najpierw multimetrem sprawdź, który", "s");
text(320, 632, "zacisk 24 V to plus: odwrotnie spalisz przetwornicę.", "s");

text(580, 16, "Płyta w centrali Wanas", "t");
text(580, 34, "sterownik ST-340, lewa krawędź", "s");
add(`<rect x="580" y="45" width="210" height="500" rx="6" fill="#2e3a2f"/>
<rect x="580" y="45" width="40" height="500" fill="#16a34a" opacity=".55"/>`);
text(632, 70, "zworkę nad MODBUS 2", "l");
text(632, 88, "zdejmij (instr. s. 51)", "l");

// Pass 2: pins
const espRight = ["D23","D22","TX0","RX0","D21","D19","D18","D5","D17 (TX2)","D16 (RX2)","D4","D2","D15","GND","3V3"];
const espLeft = ["EN","VP","VN","D34","D35","D32","D33","D25","D26","D27","D14","D12","D13","GND","VIN"];
const espUsed = new Set(["D17 (TX2)","D16 (RX2)","D4","GND","3V3"]);
const espY = {};
espRight.forEach((n, i) => {
  const y = 135 + i * 19; espY[n] = y; const on = espUsed.has(n);
  add(`<circle cx="180" cy="${y}" r="5" fill="${on ? "#d4a017" : "#475569"}" stroke="#0f172a" stroke-width="1.5"/>`);
  text(170, y, n, on ? "l" : "d", "end");
});
espLeft.forEach((n, i) => {
  const y = 135 + i * 19; const on = i === 13;
  add(`<circle cx="45" cy="${y}" r="5" fill="${on ? "#d4a017" : "#475569"}" stroke="#0f172a" stroke-width="1.5"/>`);
  text(55, y, n, on ? "l" : "d");
});

const rsLeft = { DI: 250, RO: 274, DE: 298, RE: 322, GND: 346, VCC: 370 };
const rsRight = { B: 342, A: 364 };
for (const [n, y] of Object.entries(rsLeft)) { add(`<rect x="321" y="${y-5}" width="10" height="10" fill="#d4a017"/>`); text(338, y, n, "l"); }
for (const [n, y] of Object.entries(rsRight)) { add(`<circle cx="461" cy="${y}" r="5" fill="#d1d5db" stroke="#14532d"/>`); text(440, y, n, "l", "end"); }
const buck = { "IN+": 552, "IN−": 578 };
for (const [n, y] of Object.entries(buck)) { add(`<circle cx="461" cy="${y}" r="5" fill="#d1d5db" stroke="#14532d"/>`); text(440, y, n, "l", "end"); }

const groups = [["DISP (panel)",["GND","+","B","A"],false],["Modbus 1",["GND","B","A"],false],["Modbus 2",["GND","B","A"],true],["TECH RS",["RX","TX","+","GND"],false],["DC 24V 0,5A",["+","−"],true]];
const wanasY = {}; let y = 142;
for (const [g, pins, on] of groups) {
  const y0 = y;
  for (const p of pins) {
    add(`<rect x="586" y="${y-9}" width="28" height="18" rx="2" fill="${on ? "#e5e7eb" : "#6b7280"}" stroke="#1f2937"/><line x1="594" y1="${y+5}" x2="606" y2="${y-5}" stroke="#374151" stroke-width="2"/>`);
    text(624, y, p, on ? "l" : "d"); if (on) wanasY[p] = y; y += 22;
  }
  text(662, (y0 + y - 22) / 2, g, on ? "l" : "d"); y += 12;
}
add(`<rect x="573" y="${wanasY.GND-13}" width="180" height="70" rx="8" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 4"/>
<rect x="573" y="${wanasY["+"]-13}" width="200" height="48" rx="8" fill="none" stroke="${W.pwr}" stroke-width="2" stroke-dasharray="5 4"/>`);
text(580, 562, "Zaciski 24 V mogą leżeć gdzie", "s");
text(580, 578, "indziej: szukaj napisu 24V 500mA", "s");

// Pass 3: wires, each in its own vertical channel so crossings stay readable
const wire = (d, color) => add(`<path d="${d}" class="${color ? "w" : "w g"}"${color ? ` style="stroke:${color}"` : ""}/>`);
const elbow = (x1, y1, cx, x2, y2, color) => wire(`M${x1} ${y1} H${cx} V${y2} H${x2}`, color);
elbow(185, espY["D17 (TX2)"], 210, 321, rsLeft.DI, W.tx);
elbow(185, espY["D16 (RX2)"], 225, 321, rsLeft.RO, W.rx);
elbow(185, espY.GND, 285, 321, rsLeft.GND, null);
elbow(185, espY["3V3"], 300, 321, rsLeft.VCC, W.pwr);

// D4 drives both DE and RE, joined in one Wago (or one breadboard row / screw terminal).
wire(`M185 ${espY.D4} H237`, W.dir);
wire(`M265 316 H272 V${rsLeft.DE} H321`, W.dir);
wire(`M265 ${rsLeft.RE} H321`, W.dir);
add(`<rect x="237" y="306" width="28" height="30" rx="3" fill="#e5e7eb" stroke="#64748b"/>
<rect x="241" y="300" width="6" height="8" fill="#f97316"/><rect x="248" y="300" width="6" height="8" fill="#f97316"/><rect x="255" y="300" width="6" height="8" fill="#f97316"/>`);
text(251, 350, "Wago", "s", "middle");

// Second ESP GND runs over the top to Modbus 2 GND: the module has no GND on its A/B terminal.
wire(`M40 ${espY.GND} H12 V-14 H565 V${wanasY.GND} H590`, null);
wire(`M461 ${rsRight.B} H590`, W.b);
wire(`M461 ${rsRight.A} H590`, W.a);
text(512, 300, "skrętka", "s", "middle");
text(512, 316, "(para UTP)", "s", "middle");

// Power: board 24 V into the step-down, its USB socket into the ESP's USB port.
wire(`M461 ${buck["IN+"]} H540 V${wanasY["+"]} H590`, W.pwr);
wire(`M461 ${buck["IN−"]} H555 V${wanasY["−"]} H590`, null);
add(`<path d="M113 446 V565 H312" style="fill:none;stroke:#6b7280;stroke-width:7;stroke-linecap:round;stroke-linejoin:round"/>`);
text(200, 584, "kabel USB do gniazda ESP", "s", "middle");

add("</g>\n</svg>");
writeFileSync(process.argv[2], out.join("\n") + "\n");
