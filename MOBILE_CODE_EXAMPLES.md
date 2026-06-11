# 📱 Mobile Improvements - Code Examples

## 1. Font Size Utility

Create `src/utils/mobileFonts.js`:

```jsx
export const FONT_SIZES = {
  h1: { mobile: 28, tablet: 32, desktop: 36 },
  h2: { mobile: 24, tablet: 28, desktop: 32 },
  h3: { mobile: 20, tablet: 24, desktop: 28 },
  subtitle: { mobile: 16, tablet: 18, desktop: 20 },
  body: { mobile: 15, tablet: 16, desktop: 15 },
  small: { mobile: 14, tablet: 14, desktop: 13 },
  label: { mobile: 14, tablet: 13, desktop: 12 },
  caption: { mobile: 12, tablet: 11, desktop: 10 },
}

export function getFontSize(key, screenSize = 'mobile') {
  return FONT_SIZES[key]?.[screenSize] ?? 13
}

// Usage in components:
// const fontSize = isMobile ? FONT_SIZES.body.mobile : FONT_SIZES.body.desktop
```

---

## 2. Spacing Utility

Create `src/utils/mobileSpacing.js`:

```jsx
export const SPACING = {
  // Touch-friendly minimums
  touch: 44, // min touch target
  gapMin: 8, // min gap between elements
  paddingMin: 12, // min button padding
  
  // Standard spacing
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
}

export function getSpacing(isMobile, baseValue) {
  // Increase spacing on mobile for easier touch
  return isMobile ? Math.max(baseValue, SPACING.gapMin) : baseValue
}
```

---

## 3. Nav Component Fix (CRITICAL)

**File**: `src/components/Nav.jsx`

```jsx
export function Nav({ page, setPage, userProfile, onLogin }) {
  const { T, dark } = useTheme()
  const isMobile = useIsMobile()
  
  const buttonSize = isMobile ? 44 : 32
  const buttonGap = 12 // was gap: 1 (CRITICAL BUG!)
  
  return (
    <nav style={{
      padding: "0 28px",
      height: isMobile ? 60 : 56, // slightly taller on mobile
      display: 'flex',
      alignItems: 'center',
      gap: buttonGap, // FIX: increased from gap:1
      justifyContent: 'space-between',
    }}>
      {/* Logo */}
      <Logo size={isMobile ? 32 : 34} />
      
      {/* Nav buttons with proper touch targets */}
      <div style={{ display: 'flex', gap: buttonGap, alignItems: 'center' }}>
        {['discover', 'top', 'seasons', 'calendar', 'news'].map(p => (
          <button
            key={p}
            onClick={() => setPage(p)}
            style={{
              width: buttonSize,
              height: buttonSize, // FIX: was 32, now 40+ on mobile
              borderRadius: 10,
              border: 'none',
              background: page === p ? '#8B5CF6' : 'transparent',
              color: T.txt,
              cursor: 'pointer',
              fontSize: isMobile ? 14 : 16,
              fontWeight: page === p ? 600 : 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            {getNavIcon(p)}
          </button>
        ))}
      </div>
      
      {/* Search and profile buttons */}
      <div style={{ display: 'flex', gap: buttonGap }}>
        <SearchButton size={buttonSize} />
        <ProfileButton size={buttonSize} />
      </div>
    </nav>
  )
}
```

---

## 4. Mobile Detection Pattern

**Exemplo em AnimePage**:

```jsx
export function AnimePage({ item, onClose, onStatus }) {
  const { T, dark } = useTheme()
  const isMobile = useIsMobile()
  
  // Responsive styling
  const mobileStyle = isMobile ? {
    padding: '16px',
    fontSize: 14,
  } : {
    padding: '24px 40px',
    fontSize: 15,
  }
  
  // Responsive layout
  const layoutStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr auto',
    gap: isMobile ? 12 : 24,
  }
  
  // Responsive grid for similar shows
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile 
      ? 'repeat(2, 1fr)'  // 2 columns on mobile
      : 'repeat(4, 1fr)', // 4 columns on desktop
    gap: isMobile ? 8 : 12,
  }
  
  return (
    <div style={mobileStyle}>
      <div style={layoutStyle}>
        {/* Content */}
        <div style={gridStyle}>
          {/* Grid items */}
        </div>
      </div>
    </div>
  )
}
```

---

## 5. Scroll Indicator Component

Create `src/components/ScrollIndicator.jsx`:

```jsx
import { useRef, useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'

export function ScrollContainer({ children, isMobile }) {
  const { T, dark } = useTheme()
  const scrollRef = useRef(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(true)
  
  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeft(scrollLeft > 0)
    setShowRight(scrollLeft < scrollWidth - clientWidth - 10)
  }
  
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    handleScroll()
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])
  
  if (!isMobile) {
    return (
      <div ref={scrollRef} style={{ overflowX: 'auto', scrollBehavior: 'smooth' }}>
        {children}
      </div>
    )
  }
  
  // Mobile: with scroll indicators
  return (
    <div style={{ position: 'relative' }}>
      {/* Left fade indicator */}
      {showLeft && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 40,
          background: `linear-gradient(to right, ${T.bg}, transparent)`,
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}
      
      {/* Scrollable content */}
      <div
        ref={scrollRef}
        style={{
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch', // smoother on iOS
        }}
      >
        {children}
      </div>
      
      {/* Right fade indicator */}
      {showRight && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 40,
          background: `linear-gradient(to left, ${T.bg}, transparent)`,
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}
    </div>
  )
}

// Usage:
// <ScrollContainer isMobile={isMobile}>
//   {items.map(item => <Card key={item.id} {...item} />)}
// </ScrollContainer>
```

---

## 6. Modal Mobile Optimization

**Before**:
```jsx
<div style={{
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  height: 400,
  background: T.surf,
  borderRadius: 16,
}}>
```

**After**:
```jsx
<div style={{
  position: 'fixed',
  ...(isMobile ? {
    // Mobile: bottom sheet
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '90vh',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
  } : {
    // Desktop: centered modal
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 600,
    maxHeight: '90vh',
    borderRadius: 16,
  }),
  background: T.surf,
  border: `1px solid ${T.bord}`,
  boxShadow: dark ? '0 20px 60px rgba(0,0,0,.4)' : '0 20px 60px rgba(0,0,0,.1)',
  zIndex: 100,
  overflowY: 'auto',
}}>
```

---

## 7. Touch-Friendly Button Component

```jsx
export function TouchButton({ children, onClick, variant = 'primary', isMobile }) {
  const minSize = 44 // iOS/Material design minimum
  const padding = isMobile ? 12 : 8
  
  return (
    <button
      onClick={onClick}
      style={{
        minHeight: minSize,
        minWidth: minSize,
        padding: `${padding}px ${padding + 4}px`,
        borderRadius: 10,
        border: 'none',
        cursor: 'pointer',
        fontSize: isMobile ? 14 : 13,
        fontWeight: 600,
        transition: 'all 0.2s ease',
        // ... variant styles
        WebkitTapHighlightColor: 'transparent', // remove tap flash on iOS
      }}
    >
      {children}
    </button>
  )
}
```

---

## 8. Safe Area Support

```jsx
// Global CSS for notch support
// src/index.css
.safe-area-top {
  padding-top: max(16px, env(safe-area-inset-top));
}

.safe-area-bottom {
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}

.safe-area-left {
  padding-left: max(16px, env(safe-area-inset-left));
}

.safe-area-right {
  padding-right: max(16px, env(safe-area-inset-right));
}

// In JSX:
<div className="safe-area-top safe-area-bottom">
  {/* Content that respects notches */}
</div>
```

---

## 9. Grid Layout Helper

```jsx
export function ResponsiveGrid({ items, isMobile, columnCount = {} }) {
  const cols = isMobile ? columnCount.mobile : columnCount.desktop
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: isMobile ? 8 : 12,
      autoRows: 'max-content',
    }}>
      {items.map(item => (
        <div key={item.id}>
          {/* Item */}
        </div>
      ))}
    </div>
  )
}

// Usage:
// <ResponsiveGrid 
//   items={shows} 
//   isMobile={isMobile}
//   columnCount={{ mobile: 2, desktop: 4 }}
// />
```

---

## 10. Viewport Detection Hook

**Create `src/hooks/useViewport.js`**:

```jsx
import { useState, useEffect } from 'react'

export function useViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 640 : false,
    isTablet: typeof window !== 'undefined' ? 
      window.innerWidth >= 640 && window.innerWidth < 1024 : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  })
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setViewport({
        width,
        height: window.innerHeight,
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
      })
    }
    
    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  return viewport
}

// Usage:
// const { isMobile, isTablet, width } = useViewport()
```

---

## Quick Reference Checklist

When adding mobile support to a component:

```jsx
✅ Import useIsMobile
✅ Check font sizes (min 13px on mobile)
✅ Check spacing (gap min 8px)
✅ Check button sizes (min 44x44px)
✅ Check grid columns (responsive)
✅ Test on real device
✅ Test landscape orientation
✅ Check safe-area-inset
✅ Verify no horizontal overflow
✅ Test with slow network
```

---

**Code Examples Version**: 1.0
**Last Updated**: 2026-06-10
