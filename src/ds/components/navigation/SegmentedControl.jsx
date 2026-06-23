import React from 'react';

/**
 * TP-7 Core — SegmentedControl
 * Fused mechanical keys in a recessed channel. Exactly one segment is
 * engaged (depressed) at a time. The TP-7 mode selector.
 */
export function SegmentedControl({
  options = [],          // [{ value, label }] or ['A','B']
  value,
  onChange,
  size = 'md',           // 'sm' | 'md'
  style = {},
}) {
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const h = size === 'sm' ? 'var(--control-h-sm)' : 'var(--control-h)';

  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        padding: '3px', gap: '3px',
        background: 'var(--bg-sunken)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-inset)',
        border: '1px solid var(--border-channel)',
        ...style,
      }}
    >
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange && onChange(it.value)}
            style={{
              appearance: 'none',
              height: h, padding: '0 16px', minWidth: 'var(--key-min-w)',
              font: 'var(--weight-semibold) var(--text-xs)/1 var(--font-sans)',
              letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase',
              color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: on ? 'var(--surface-raised)' : 'transparent',
              border: on ? '1px solid rgba(0,0,0,0.16)' : '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              boxShadow: on ? 'var(--shadow-key)' : 'none',
              cursor: 'pointer',
              transition: 'background var(--dur-fast) var(--ease-mech), color var(--dur-fast) var(--ease-mech)',
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
