import React from 'react'
import './Switch.css'

/**
 * Switch (Shadcn-style) — переключатель на основе checkbox.
 * @param {boolean} checked
 * @param {function(boolean)} onCheckedChange
 * @param {boolean} [disabled]
 */
function Switch({ checked, onCheckedChange, disabled = false, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      disabled={disabled}
      className={`switch-root ${checked ? 'switch-checked' : ''} ${disabled ? 'switch-disabled' : ''}`}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      {...props}
    >
      <span className="switch-thumb" />
    </button>
  )
}

export default Switch
