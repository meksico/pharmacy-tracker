import React from 'react';

/**
 * TP-7 Core — AppIcon
 *
 * The system's app-icon template. Five layers:
 *   1. Squircle chassis — radial brushed aluminum
 *   2. Tape-reel disc — large matte grey circle
 *   3. Hub notch — spindle cutout at 12 o'clock
 *   4. Label plate — aluminum plate, notched top-right corner
 *   5. Orange accent — M badge (in notch) + record dot before line 2
 *
 * Only TWO orange elements are allowed: the badge and the record dot.
 */
export function AppIcon({ line1, line2 = 'TRACKER', badge = 'M', size = 160, style = {} }) {
  const uid = React.useId ? React.useId().replace(/:/g, '') : (line1 + line2).replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, 12);
  const id = `tp7ic${uid}`;

  // ── Plate geometry (1000×1000 viewBox) ────────────────────────────
  const px = 152, py = 382, pw = 696, ph = 276, pr = 42;
  const nw = 96, nh = 66; // notch: top-right rectangular step

  // ── Badge ─────────────────────────────────────────────────────────
  const bx = px + pw - nw; // 748 — flush with notch left edge
  const by = py - 22;       // 360 — pokes 22px above plate
  const bw = nw;             // 96 — fills notch width
  const bh = nh + 22;       // 88 — nh + protrusion
  const br = 13;

  // ── Typography ────────────────────────────────────────────────────
  // fs1 scales inversely with character count to fill ~80% plate width
  const fs1 = Math.max(84, Math.min(218, Math.floor((pw - 88) / (line1.length * 0.80))));
  const fs2 = 76, dotR = 21;

  // Vertical: centre text block in plate
  const capH = Math.round(fs1 * 0.72);
  const blockH = capH + 18 + dotR * 2;
  const blockTop = py + Math.round((ph - blockH) / 2) + 2;
  const line1Y = blockTop + capH;            // baseline of line1
  const dotCY  = blockTop + capH + 18 + dotR; // centre of dot / line2
  const line2Y  = dotCY + Math.round(fs2 * 0.36); // baseline of line2
  const tX = px + 44;                         // text left margin

  // ── Plate path ────────────────────────────────────────────────────
  const pp = [
    `M ${px + pr},${py}`,
    `L ${px + pw - nw},${py}`,         // top edge → notch start
    `L ${px + pw - nw},${py + nh}`,   // notch: left side down
    `L ${px + pw},${py + nh}`,         // notch: step right to plate edge
    `L ${px + pw},${py + ph - pr}`,   // right side down
    `A ${pr},${pr} 0 0,1 ${px + pw - pr},${py + ph}`, // bottom-right arc
    `L ${px + pr},${py + ph}`,         // bottom edge
    `A ${pr},${pr} 0 0,1 ${px},${py + ph - pr}`,      // bottom-left arc
    `L ${px},${py + pr}`,              // left side up
    `A ${pr},${pr} 0 0,1 ${px + pr},${py}`,            // top-left arc
    'Z',
  ].join(' ');

  // ── Brushed concentric ring texture ───────────────────────────────
  const rings = Array.from({ length: Math.floor((740 - 28) / 22) }, (_, i) => {
    const r = 28 + i * 22;
    const light = i % 2 === 0;
    return (
      <circle key={r} cx="500" cy="500" r={r} fill="none"
        stroke={light ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.028)'}
        strokeWidth="1.2" />
    );
  });

  const font1 = "'Archivo Expanded','Archivo','Helvetica Neue',Arial,sans-serif";
  const font2 = "'Archivo','Helvetica Neue',Arial,sans-serif";

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
      width={size} height={size} style={{ display: 'block', overflow: 'hidden', ...style }}>
      <defs>
        <clipPath id={`${id}sq`}>
          <path d="M225,0 C103,0 0,103 0,225 L0,775 C0,897 103,1000 225,1000 L775,1000 C897,1000 1000,897 1000,775 L1000,225 C1000,103 897,0 775,0 Z"/>
        </clipPath>
        <radialGradient id={`${id}bg`} cx="50%" cy="46%" r="70%">
          <stop offset="0%" stopColor="#F4F4F4"/><stop offset="52%" stopColor="#E9E9E9"/><stop offset="100%" stopColor="#CECECE"/>
        </radialGradient>
        <radialGradient id={`${id}di`} cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#888888"/><stop offset="62%" stopColor="#767676"/><stop offset="100%" stopColor="#646464"/>
        </radialGradient>
        <linearGradient id={`${id}pl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2F2F2"/><stop offset="6%" stopColor="#EAEAEA"/>
          <stop offset="82%" stopColor="#DBDBDB"/><stop offset="100%" stopColor="#C6C6C6"/>
        </linearGradient>
        <filter id={`${id}sh`} x="-30%" y="-20%" width="160%" height="170%">
          <feGaussianBlur stdDeviation="20"/>
        </filter>
      </defs>

      <g clipPath={`url(#${id}sq)`}>
        {/* Chassis background */}
        <rect width="1000" height="1000" fill={`url(#${id}bg)`}/>
        {/* Brushed concentric rings */}
        {rings}

        {/* Tape reel disc */}
        <circle cx="500" cy="558" r="392" fill={`url(#${id}di)`}/>
        <circle cx="500" cy="558" r="392" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="3"/>
        <circle cx="500" cy="558" r="389" fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth="2"/>

        {/* Reel groove rings (detail) */}
        <circle cx="500" cy="558" r="320" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5"/>
        <circle cx="500" cy="558" r="240" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5"/>

        {/* Hub notch (exposes chassis at 12 o'clock) */}
        <circle cx="500" cy="184" r="66" fill={`url(#${id}bg)`}/>
        <circle cx="500" cy="184" r="66" fill="none" stroke="rgba(0,0,0,0.20)" strokeWidth="3"/>
        <circle cx="500" cy="184" r="48" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5"/>

        {/* Plate: shadow (blurred copy offset down) */}
        <path d={pp} transform="translate(0,18)" fill="rgba(0,0,0,0.52)" filter={`url(#${id}sh)`}/>

        {/* Plate: face */}
        <path d={pp} fill={`url(#${id}pl)`} stroke="rgba(0,0,0,0.13)" strokeWidth="1.5"/>

        {/* Plate: bevel highlights */}
        <line x1={px + pr + 2} y1={py + 1.5} x2={px + pw - nw - 2} y2={py + 1.5}
          stroke="rgba(255,255,255,0.90)" strokeWidth="3" strokeLinecap="round"/>
        <line x1={px + 1.5} y1={py + pr} x2={px + 1.5} y2={py + ph - pr}
          stroke="rgba(255,255,255,0.50)" strokeWidth="2.5" strokeLinecap="round"/>

        {/* Plate: bevel shadows (extrusion) */}
        <line x1={px + pr} y1={py + ph - 1} x2={px + pw - pr} y2={py + ph - 1}
          stroke="rgba(0,0,0,0.22)" strokeWidth="2.5"/>
        <line x1={px + pw - 1} y1={py + nh + 2} x2={px + pw - 1} y2={py + ph - pr}
          stroke="rgba(0,0,0,0.16)" strokeWidth="2"/>

        {/* Line 1: App name */}
        <text x={tX} y={line1Y}
          fontFamily={font1} fontWeight="800" fontSize={fs1} fill="#111111">
          {line1}
        </text>

        {/* Line 2: Record dot */}
        <circle cx={tX + dotR} cy={dotCY} r={dotR} fill="#FF4F00"/>

        {/* Line 2: Category */}
        <text x={tX + dotR * 2 + 12} y={line2Y}
          fontFamily={font1} fontWeight="700" fontSize={fs2} fill="#111111">
          {line2}
        </text>

        {/* Badge: background */}
        <rect x={bx} y={by} width={bw} height={bh} rx={br} fill="#FF4F00"/>
        {/* Badge: inner top highlight */}
        <rect x={bx + 2} y={by + 2} width={bw - 4} height={Math.round(bh * 0.44)} rx={br - 2}
          fill="rgba(255,255,255,0.18)"/>
        {/* Badge: letter */}
        <text x={bx + bw / 2} y={by + bh / 2}
          fontFamily={font2} fontWeight="800"
          fontSize={Math.round(bh * 0.53)} fill="white"
          textAnchor="middle" dominantBaseline="central">
          {badge}
        </text>
      </g>
    </svg>
  );
}
