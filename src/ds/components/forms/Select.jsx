import React from 'react';

/**
 * TP-7 Core — Select
 * A native select dressed as a raised tactile key with an etched chevron.
 */
export function Select({
  label = null,
  disabled = false,
  children,
  style = {},
  ...rest
}) {
  return (
    <label style={{ display: 'block', ...style }}>
      {label && (
        <span style={{
          display: 'block', marginBottom: '6px',
          font: 'var(--weight-semibold) var(--text-xs)/1 var(--font-sans)',
          letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}>{label}</span>
      )}
      <span style={{ position: 'relative', display: 'block' }}>
        <select
          disabled={disabled}
          style={{
            appearance: 'none', width: '100%',
            height: 'var(--control-h)', padding: '0 34px 0 12px',
            font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)',
            color: 'var(--text-primary)',
            background: 'var(--surface-card)',
            border: '1px solid rgba(0,0,0,0.18)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-key)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
          {...rest}
        >
          {children}
        </select>
        <svg viewBox="0 0 12 12" width="11" height="11" style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: 'var(--text-secondary)',
        }}>
          <path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
        </svg>
      </span>
    </label>
  );
}
