import { useRef } from 'react'
import { shouldTreatPointerAsTap } from '../../utils/mobileInteraction'

export function ClickableCard({ children, onClick, className = '', style, ariaLabel, as = 'button', ...props }) {
  const pointerStartRef = useRef(null)
  const Component = as

  const handlePointerDown = e => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleClick = e => {
    const pointerStart = pointerStartRef.current
    pointerStartRef.current = null
    if (pointerStart && !shouldTreatPointerAsTap(pointerStart, { x: e.clientX, y: e.clientY })) return
    onClick?.(e)
  }

  const keyboardProps = Component === 'button'
    ? { type: 'button' }
    : {
        role: 'button',
        tabIndex: 0,
        onKeyDown: e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.(e)
          }
        },
      }

  return (
    <Component
      {...keyboardProps}
      {...props}
      aria-label={ariaLabel}
      className={`clickable-card t ${className}`.trim()}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      style={{
        border: 'none',
        padding: 0,
        textAlign: 'left',
        color: 'inherit',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        ...style,
      }}
    >
      {children}
    </Component>
  )
}
