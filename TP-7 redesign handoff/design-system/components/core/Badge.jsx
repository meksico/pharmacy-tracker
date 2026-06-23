import React from 'react';

/**
 * TP-7 Core — Badge
 * A compact status indicator. `live` carries the critical accent with an
 * optional pulsing dot for recording / active states.
 */
export function Badge({
  variant = 'neutral',  // 'neutral' | 'solid' | 'live' | 'outline'
  dot = false,
  children,
  style = {},
  ...rest
}) {
  const variants = {
    neutral: { background: 'var(--grey-300)', color: 'var(--text-primary)', border: '1px solid rgba(0,0,0,0.12)' },
    solid:   { background: 'var(--grey-950)', color: 'var(--grey-50)',      border: '1px solid #000' },
    live:    { background: 'var(--orange-500)', color: 'var(--grey-0)',     border: '1px solid rgba(0,0,0,0.2)' },
    outline: { background: 'transparent', color: 'var(--text-secondary)',   border: '1px solid var(--border-hairline)' },
  }[variant];

  const dotColor = variant === 'live' ? 'var(--grey-0)' : 'var(--orange-500)';

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        height: '20px', padding: '0 8px',
        font: 'var(--weight-bold) var(--text-2xs)/1 var(--font-mono)',
        letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase',
        borderRadius: 'var(--radius-sm)',
        ...variants, ...style,
      }}
      {...rest}
    >
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: 'var(--radius-pill)',
          background: dotColor, flex: 'none',
          animation: variant === 'live' ? 'tp7-pulse 1.1s steps(1,end) infinite' : 'none',
        }} />
      )}
      {children}
      <style>{`@keyframes tp7-pulse{0%,50%{opacity:1}50.01%,100%{opacity:0.25}}`}</style>
    </span>
  );
}
