# 📱 Mobile Implementation Plan

## Phase 1: Critical Fixes (Sprint 1)

### 1.1 Fix Nav Component (gap:1 issue)
**File**: `src/components/Nav.jsx`
**Problem**: Gap of 1px between buttons is unacceptable for touch
**Impact**: Navigation unusable on mobile

```diff
// Current (line ~246)
- gap: 1
+ gap: 8  // mobile: 8px, desktop: could be less but 8px is safe

// Also increase button sizes for touch
- width: 32, height: 32
+ mobile ? { width: 40, height: 40 } : { width: 32, height: 32 }
```

**Acceptance Criteria**:
- Buttons are 40x40px on mobile
- Gap between buttons is at least 8px
- Touch friendly on real device

---

### 1.2 Add Mobile Detection to NewsPage
**File**: `src/pages/NewsPage.jsx`
**Changes**:
```jsx
// Add at top
import { useIsMobile } from '../hooks/useIsMobile'

// In component
const isMobile = useIsMobile()

// Use for:
- Font size scaling (fontSize: isMobile ? 14 : 13)
- Grid layout (gridTemplateColumns: isMobile ? '1fr' : '...')
- Spacing (padding: isMobile ? 12 : 16)
```

---

### 1.3 Add Mobile Detection to SearchPage
**File**: `src/pages/SearchPage.jsx`
**Changes**:
- Add `useIsMobile` hook
- Scale font sizes for mobile
- Adjust search input size
- Fix result card spacing

---

### 1.4 Add Mobile Detection to CategoriesPage  
**File**: `src/pages/CategoriesPage.jsx`
**Changes**:
- Add `useIsMobile` hook
- Adjust genre chip spacing (increase from gap:1)
- Scale surprise card for mobile
- Fix grid layout

---

### 1.5 Increase Minimum Font Size Globally
**Impact**: 70 font size instances

**Strategy**: Create font size mapping
```jsx
// src/utils/mobileFonts.js
export const getFontSize = (name, isMobile) => {
  const sizes = {
    caption: { mobile: 12, desktop: 10 },
    label: { mobile: 14, desktop: 11 },
    body: { mobile: 15, desktop: 13 },
    subtitle: { mobile: 16, desktop: 14 },
  }
  return sizes[name]?.[isMobile ? 'mobile' : 'desktop'] ?? 13
}
```

**Components to update**:
- Nav buttons
- Media card titles
- Episode cards
- Stat labels
- Tab labels

---

## Phase 2: High Priority Improvements (Sprint 2)

### 2.1 Fix All Gap < 8px
**Count**: 60 instances
**Strategy**:
1. Audit each gap
2. Replace gap:1-7 with gap:8+
3. Verify layout still looks good

**Files to check**:
```
- src/components/MediaCard.jsx
- src/components/ShelfRow.jsx
- src/components/ContinueWatchingRow.jsx
- src/pages/AnimePage.jsx
- src/pages/TopPage.jsx
```

---

### 2.2 Add Scroll Indicators
**Files affected**:
- ContinueWatchingRow (horizontal scroll)
- Shelf rows (horizontal scroll)
- Genre chips in CategoriesPage

**Implementation**:
```jsx
// Add fade indicator for horizontal scroll
const showLeftFade = scrollPos > 0
const showRightFade = scrollPos < (maxScroll - 10)

return (
  <div style={{ position: 'relative' }}>
    {showLeftFade && <div className="scroll-fade-left" />}
    <div ref={scrollRef} style={{ overflowX: 'auto' }}>
      {/* content */}
    </div>
    {showRightFade && <div className="scroll-fade-right" />}
  </div>
)
```

---

### 2.3 Optimize Modals for Mobile
**Files**: All modals/drawers
**Changes**:
- Add safe-area-inset for notch devices
- Make full-height on mobile
- Add bottom padding for mobile keyboard
- Remove fixed heights

```jsx
// Mobile optimization template
const modalStyle = isMobile ? {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  maxHeight: '90vh',
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
} : {
  // desktop styles
}
```

---

### 2.4 Review & Fix Overflow Hidden
**Count**: 80 elements
**Action**: Audit each, decide if it needs text-truncate instead

**Examples**:
```jsx
// Bad for mobile (cuts content)
overflow: 'hidden'

// Better (with ellipsis)
overflow: 'hidden',
textOverflow: 'ellipsis',
whiteSpace: 'nowrap'

// Best (with line clamp for multi-line)
display: '-webkit-box',
WebkitLineClamp: 2,
WebkitBoxOrient: 'vertical',
overflow: 'hidden'
```

---

## Phase 3: Medium Priority (Sprint 3)

### 3.1 Fix Viewport Units
**Files**: 
- src/App.jsx
- src/index.css

**Change vh → relative units**:
```css
/* Before */
min-height: 72vh;

/* After */
min-height: min(72vh, 80vh); /* clamp to safe viewport */
```

---

### 3.2 Touch Target Standards
**Rule**: All interactive elements should be 44x44px minimum

**Apply to**:
- Buttons
- Icon buttons
- Checkbox/radio inputs
- Link hit areas

---

### 3.3 Grid Layout Mobile-First
**Audit all grids**:
```jsx
// Current (might be too narrow)
gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))'

// Better for mobile
gridTemplateColumns: isMobile ? 
  'repeat(2, 1fr)' : 
  'repeat(auto-fill, minmax(190px, 1fr))'
```

---

## Implementation Priority Matrix

```
IMPACT vs EFFORT:

HIGH IMPACT / LOW EFFORT (Do First!)
✅ Nav gap:1 fix
✅ Font size increase to 13px min
✅ Mobile detection in 3 pages
✅ Scroll indicators

MEDIUM IMPACT / MEDIUM EFFORT
⚠️ All gap < 8px fixes
⚠️ Modal optimization
⚠️ Grid layout review

LOWER IMPACT / CAN BE DEFERRED
💡 vh/vw fixes
💡 Gesture support
💡 Safe-area-inset
```

---

## Component Update Checklist

### Nav.jsx
- [ ] Remove gap:1, set to gap:8
- [ ] Test button sizes on device
- [ ] Verify touch-friendly on mobile

### NewsPage.jsx
- [ ] Add useIsMobile
- [ ] Increase card padding on mobile
- [ ] Scale font sizes
- [ ] Test grid layout on 375px

### SearchPage.jsx
- [ ] Add useIsMobile
- [ ] Fix result card layout
- [ ] Increase touch targets
- [ ] Test search input on mobile

### CategoriesPage.jsx
- [ ] Add useIsMobile
- [ ] Fix chip spacing (increase gap)
- [ ] Scale surprise card
- [ ] Test layout on 360px

### MediaCard.jsx
- [ ] Increase base font size
- [ ] Adjust padding on mobile
- [ ] Test with long titles
- [ ] Check overflow behavior

### ContinueWatchingRow.jsx
- [ ] Add scroll indicator (fade)
- [ ] Improve scroll UX
- [ ] Test on mobile device

### WatchPanel.jsx
- [ ] Add safe-area-inset for notch
- [ ] Test episode grid on mobile
- [ ] Verify control layout

### AnimePage.jsx
- [ ] Scale all font sizes
- [ ] Fix spacing consistency
- [ ] Test on 375px viewport

---

## Testing Strategy

### Device Testing
```
1. iPhone SE (375px) - oldest small phone
2. Galaxy S20 (360px) - Android baseline
3. iPhone 14 Pro (390px) - modern iOS
4. iPad mini (768px) - tablet
5. Android tablet (800px)
```

### Browser DevTools Testing
```
1. Chrome DevTools mobile emulation
2. Firefox Responsive Design Mode
3. Safari on real iOS device
4. Chrome on real Android device
```

### Orientation Testing
```
1. Portrait (all devices)
2. Landscape (all devices)
3. Notch/Safe area (iPhone X+)
4. Under-display camera (new phones)
```

### Performance Testing
```
1. Network: Slow 3G
2. CPU: 4x throttle
3. GPU: Off (important for animations)
4. Touch latency: Test responsiveness
```

---

## Success Metrics

### Before Improvements
- [ ] 70 small font sizes
- [ ] 60 small gaps
- [ ] Gap:1 in Nav (unusable)
- [ ] 14 unmarked scrolls
- [ ] Inconsistent mobile detection

### After Phase 1 (Critical)
- [ ] 0 gap < 8px in Nav
- [ ] Font minimum is 13px
- [ ] Mobile detection in all pages
- [ ] Navigation touch-friendly

### After Phase 2 (High Priority)
- [ ] All gaps ≥ 8px
- [ ] Scroll indicators present
- [ ] Modals optimized for mobile
- [ ] No unintended overflow

### After Phase 3 (Complete)
- [ ] All touch targets 44x44px
- [ ] Tested on real devices
- [ ] Accessible on all screen sizes
- [ ] WCAG AA compliant mobile

---

## Estimated Timeline

| Phase | Tasks | Effort | Timeline |
|---|---|---|---|
| 1 | 5 critical fixes | 8 hours | 1-2 days |
| 2 | 4 high priority | 12 hours | 2-3 days |
| 3 | 3 medium priority | 6 hours | 1 day |
| Testing | Device + QA testing | 8 hours | 1 day |
| **TOTAL** | **All improvements** | **34 hours** | **1-2 weeks** |

---

## Rollout Plan

### Week 1
- [ ] Implement Phase 1 (critical fixes)
- [ ] Internal testing
- [ ] Fix any blocking issues

### Week 2  
- [ ] Implement Phase 2 (high priority)
- [ ] Device testing with real phones
- [ ] Performance optimization

### Week 3
- [ ] Implement Phase 3 (medium priority)
- [ ] Final testing and polish
- [ ] Deploy to production

### Week 4
- [ ] Monitor mobile user experience
- [ ] Collect user feedback
- [ ] Plan additional improvements

---

## Notes for Developers

1. **Use isMobile consistently**: Check all hooks imports
2. **Test responsively**: Use DevTools AND real devices
3. **Touch-first**: Assume touch, not mouse
4. **Performance**: Mobile networks are slower
5. **Accessibility**: Test with screen reader
6. **Safe areas**: Account for notches/rounded corners

---

**Document Version**: 1.0
**Last Updated**: 2026-06-10
**Status**: Ready for implementation
