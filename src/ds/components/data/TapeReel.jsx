import React from 'react';

/**
 * TP-7 Core — TapeReel
 * The motorized-wheel centerpiece. A circular disc that rotates while
 * `spinning`, with a progress ring tracking completion. Use for any
 * durable workflow: playback, recording, loading, scrubbing.
 *
 * It is the system's signature data-visualisation — prefer it over a
 * generic spinner or linear progress bar wherever a process has a position.
 */
export function TapeReel({
  spinning = false,
  progress = 0,          // 0..1, drives the orange ring
  rpm = 16,              // rotation speed when spinning
  size = 160,
  label = null,          // centre hub label (e.g. time)
  reverse = false,
  style = {},
}) {
  const R = size / 2;
  const ring = R - 6;
  const circ = 2 * Math.PI * ring;
  const spokes = Array.from({ length: 6 });

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '10px', ...style }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Progress ring */}
        <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx={R} cy={R} r={ring} fill="none" stroke="var(--grey-300)" strokeWidth="3" />
          <circle
            cx={R} cy={R} r={ring} fill="none"
            stroke="var(--orange-500)" strokeWidth="3" strokeLinecap="butt"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - Math.max(0, Math.min(1, progress)))}
            style={{ transition: 'stroke-dashoffset var(--dur-base) linear' }}
          />
        </svg>

        {/* Rotating disc */}
        <div style={{
          position: 'absolute', inset: 12,
          borderRadius: 'var(--radius-pill)',
          background: 'radial-gradient(circle at 50% 40%, var(--grey-100), var(--grey-300) 70%, var(--grey-400))',
          border: '1px solid rgba(0,0,0,0.28)',
          boxShadow: 'var(--shadow-key)',
          animation: spinning ? `tp7-reel ${60 / rpm}s linear infinite ${reverse ? 'reverse' : ''}` : 'none',
        }}>
          {/* spokes / holes */}
          {spokes.map((_, i) => {
            const a = (i / spokes.length) * 360;
            return (
              <span key={i} style={{
                position: 'absolute', left: '50%', top: '50%',
                width: size * 0.07, height: size * 0.07,
                marginLeft: -(size * 0.035), marginTop: -(size * 0.035),
                borderRadius: 'var(--radius-pill)',
                background: 'var(--grey-800)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
                transform: `rotate(${a}deg) translateY(-${size * 0.27}px)`,
              }} />
            );
          })}
          {/* hub */}
          <div style={{
            position: 'absolute', inset: '34%',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--grey-900)',
            border: '2px solid var(--grey-600)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {label && (
              <span style={{
                font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)',
                letterSpacing: 'var(--tracking-mono)', color: 'var(--orange-500)',
                fontVariantNumeric: 'tabular-nums',
              }}>{label}</span>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes tp7-reel{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
