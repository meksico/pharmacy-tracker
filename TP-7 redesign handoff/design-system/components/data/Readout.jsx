import React from 'react';

/**
 * TP-7 Core — Readout
 * A telemetry display: glowing mono glyphs on a dark recessed screen. Use
 * for counters, timers, levels and raw data. The accent here is permitted
 * (it reads as an illuminated display, not a control).
 */
export function Readout({
  value = '00:00:00',
  unit = null,
  caption = null,        // small etched label above
  color = 'var(--orange-500)',  // display glyph colour
  size = 'lg',           // 'sm' | 'md' | 'lg' | 'xl'
  align = 'left',
  style = {},
  ...rest
}) {
  const fonts = {
    sm: 'var(--text-lg)', md: 'var(--text-2xl)',
    lg: 'var(--text-3xl)', xl: 'var(--text-4xl)',
  };
  return (
    <div
      style={{
        display: 'inline-block',
        background: 'var(--surface-screen)',
        border: '1px solid #000',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-inset)',
        padding: '14px 18px',
        ...style,
      }}
      {...rest}
    >
      {caption && (
        <div style={{
          font: 'var(--weight-semibold) var(--text-2xs)/1 var(--font-mono)',
          letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase',
          color: 'var(--grey-500)', marginBottom: '8px', textAlign: align,
        }}>{caption}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', gap: '8px' }}>
        <span style={{
          font: `var(--weight-medium) ${fonts[size]}/1 var(--font-mono)`,
          letterSpacing: 'var(--tracking-mono)',
          fontVariantNumeric: 'tabular-nums',
          color,
          textShadow: `0 0 12px ${color}66`,
        }}>{value}</span>
        {unit && (
          <span style={{
            font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)',
            letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase',
            color: 'var(--grey-500)',
          }}>{unit}</span>
        )}
      </div>
    </div>
  );
}
