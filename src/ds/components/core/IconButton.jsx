import React from 'react';

/**
 * TP-7 Core — IconButton
 * A square tactile key holding a single glyph. The atomic transport control
 * (play / stop / record / skip). Pass an SVG or glyph as `children`.
 */
export function IconButton({
  variant = 'surface',  // 'surface' | 'routine' | 'critical' | 'ghost'
  size = 'md',          // 'sm' | 'md' | 'lg'
  active = false,
  disabled = false,
  'aria-label': ariaLabel,
  children,
  style = {},
  ...rest
}) {
  const dims = { sm: 28, md: 36, lg: 48 };
  const d = dims[size];

  const palette = {
    surface:  { bg: 'var(--surface-card)', fg: 'var(--action-routine)' },
    routine:  { bg: 'var(--grey-950)',     fg: 'var(--grey-50)' },
    critical: { bg: 'var(--orange-500)',   fg: 'var(--grey-0)' },
    ghost:    { bg: 'transparent',         fg: 'var(--text-primary)' },
  }[variant];

  const base = {
    appearance: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: d, height: d,
    padding: 0,
    color: palette.fg,
    background: palette.bg,
    border: variant === 'ghost' ? '1px solid var(--border-hairline)' : '1px solid rgba(0,0,0,0.18)',
    borderRadius: 'var(--radius-sm)',
    boxShadow: variant === 'ghost' ? 'none' : (active ? 'var(--shadow-key-pressed)' : 'var(--shadow-key)'),
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'box-shadow var(--dur-press) var(--ease-mech), transform var(--dur-press) var(--ease-mech)',
    transform: active ? 'translateY(0.5px)' : 'none',
    WebkitTapHighlightColor: 'transparent',
    ...style,
  };
  const glyph = { width: Math.round(d * 0.42), height: Math.round(d * 0.42), display: 'block' };

  const press = (e) => {
    if (disabled) return;
    e.currentTarget.style.boxShadow = 'var(--shadow-key-pressed)';
    e.currentTarget.style.transform = 'translateY(1px)';
  };
  const release = (e) => {
    if (disabled || variant === 'ghost') return;
    e.currentTarget.style.boxShadow = active ? 'var(--shadow-key-pressed)' : 'var(--shadow-key)';
    e.currentTarget.style.transform = active ? 'translateY(0.5px)' : 'none';
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      style={base}
      onMouseDown={press}
      onMouseUp={release}
      onMouseLeave={release}
      {...rest}
    >
      <span style={glyph}>{children}</span>
    </button>
  );
}
