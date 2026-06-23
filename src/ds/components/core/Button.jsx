import React from 'react';

/**
 * TP-7 Core — Button
 * A tactile, physically-modelled key. Raised by default; depresses on press
 * with an inset shadow, like a real mechanical switch.
 *
 * Discipline: only ONE `critical` (orange) button should appear per view.
 */
export function Button({
  variant = 'surface',   // 'surface' | 'routine' | 'critical' | 'ghost'
  size = 'md',           // 'sm' | 'md' | 'lg'
  disabled = false,
  active = false,        // sticky "engaged" state (e.g. a latched toggle)
  startIcon = null,
  children,
  style = {},
  ...rest
}) {
  const heights = { sm: 'var(--control-h-sm)', md: 'var(--control-h)', lg: 'var(--control-h-lg)' };
  const padX    = { sm: '12px', md: '16px', lg: '22px' };
  const fontPx  = { sm: 'var(--text-xs)', md: 'var(--text-sm)', lg: 'var(--text-md)' };

  const palette = {
    surface:  { bg: 'var(--surface-card)', fg: 'var(--text-primary)' },
    routine:  { bg: 'var(--grey-950)',     fg: 'var(--grey-50)' },
    critical: { bg: 'var(--orange-500)',   fg: 'var(--grey-0)' },
    ghost:    { bg: 'transparent',         fg: 'var(--text-primary)' },
  }[variant];

  const base = {
    appearance: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    height: heights[size],
    minWidth: 'var(--key-min-w)',
    padding: `0 ${padX[size]}`,
    font: `var(--weight-semibold) ${fontPx[size]}/1 var(--font-sans)`,
    letterSpacing: 'var(--tracking-label)',
    textTransform: 'uppercase',
    color: palette.fg,
    background: palette.bg,
    border: variant === 'ghost'
      ? '1px solid var(--border-hairline)'
      : '1px solid rgba(0,0,0,0.18)',
    borderRadius: 'var(--radius-sm)',
    boxShadow: variant === 'ghost' ? 'none' : (active ? 'var(--shadow-key-pressed)' : 'var(--shadow-key)'),
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: `box-shadow var(--dur-press) var(--ease-mech), transform var(--dur-press) var(--ease-mech), background var(--dur-fast) var(--ease-mech)`,
    transform: active ? 'translateY(0.5px)' : 'none',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    ...style,
  };

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
      disabled={disabled}
      style={base}
      onMouseDown={press}
      onMouseUp={release}
      onMouseLeave={release}
      {...rest}
    >
      {startIcon && <span style={{ display: 'inline-flex', width: '1em', height: '1em' }}>{startIcon}</span>}
      {children}
    </button>
  );
}
