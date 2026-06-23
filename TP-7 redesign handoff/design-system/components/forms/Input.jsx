import React from 'react';

/**
 * TP-7 Core — Input
 * A recessed data well. The field sits below the chassis surface (inset
 * shadow) like an engraved channel. Mono option for telemetry entry.
 */
export function Input({
  label = null,
  unit = null,          // trailing etched unit, e.g. "dB", "ms"
  mono = false,
  invalid = false,
  disabled = false,
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
      <span style={{
        display: 'flex', alignItems: 'center',
        height: 'var(--control-h)', padding: '0 12px',
        background: disabled ? 'var(--grey-150)' : 'var(--grey-50)',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${invalid ? 'var(--orange-500)' : 'var(--border-channel)'}`,
        boxShadow: 'var(--shadow-inset)',
        opacity: disabled ? 0.6 : 1,
      }}>
        <input
          disabled={disabled}
          style={{
            flex: 1, minWidth: 0,
            appearance: 'none', border: 'none', outline: 'none', background: 'transparent',
            color: 'var(--text-primary)',
            font: mono
              ? 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)'
              : 'var(--weight-regular) var(--text-sm)/1 var(--font-sans)',
            letterSpacing: mono ? 'var(--tracking-mono)' : 'normal',
          }}
          {...rest}
        />
        {unit && (
          <span style={{
            marginLeft: '8px', flex: 'none',
            font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)',
            letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}>{unit}</span>
        )}
      </span>
    </label>
  );
}
