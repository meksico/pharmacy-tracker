import React from 'react';

/**
 * TP-7 Core — Card
 * A framed module. `surface` is a raised key-top; `sunken` is a recessed
 * well; `screen` is the dark telemetry display panel.
 */
export function Card({
  variant = 'surface',  // 'surface' | 'sunken' | 'screen' | 'flat'
  label = null,         // optional etched corner label
  padding = 'var(--space-6)',
  children,
  style = {},
  ...rest
}) {
  const variants = {
    surface: {
      background: 'var(--surface-card)',
      boxShadow: 'var(--shadow-key)',
      border: '1px solid rgba(0,0,0,0.14)',
      color: 'var(--text-primary)',
    },
    sunken: {
      background: 'var(--bg-sunken)',
      boxShadow: 'var(--shadow-inset)',
      border: '1px solid var(--border-channel)',
      color: 'var(--text-primary)',
    },
    screen: {
      background: 'var(--surface-screen)',
      boxShadow: 'var(--shadow-inset)',
      border: '1px solid #000',
      color: 'var(--grey-50)',
    },
    flat: {
      background: 'var(--surface-card)',
      boxShadow: 'none',
      border: '1px solid var(--border-hairline)',
      color: 'var(--text-primary)',
    },
  }[variant];

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-md)',
        padding,
        ...variants,
        ...style,
      }}
      {...rest}
    >
      {label && (
        <span style={{
          position: 'absolute', top: 10, right: 12,
          font: 'var(--weight-semibold) var(--text-2xs)/1 var(--font-mono)',
          letterSpacing: 'var(--tracking-wide)',
          textTransform: 'uppercase',
          color: variant === 'screen' ? 'var(--grey-500)' : 'var(--text-secondary)',
        }}>{label}</span>
      )}
      {children}
    </div>
  );
}
