# Terminal CLI Settings GUI & Transparent MapLibre Popups

## Overview

1. **Terminal CLI Settings GUI**: A dark, command terminal styled menu without
   generic AI design elements or emojis.
2. **Transparent Popups (25% Opacity)**: MapLibre popup containers feature 25%
   opacity background (`rgba(255, 255, 255, 0.25)` in light mode,
   `rgba(13, 17, 23, 0.25)` in dark mode) paired with
   `backdrop-filter: blur(8px)` and **sharp 90 degree square corners**
   (`border-radius: 0 !important`).
3. **Compact Route Target Badges**: When routing is triggered (on mobile tap or
   desktop click), start and destination target popups use a compact mini-badge
   layout (`.compact-route-popup`) with sharp square edges to prevent blocking
   the map route line or view.

---

## Technical Specs

### 1. Translucent MapLibre Popup Box

- **Background**: `rgba(255, 255, 255, 0.25) !important` (Light) /
  `rgba(13, 17, 23, 0.25) !important` (Dark).
- **Backdrop Effect**: `backdrop-filter: blur(8px)`.
- **Corner Style**: `border-radius: 0 !important` (sharp 90 degree square
  edges).

### 2. Compact Route Target Badges

- Class `.compact-route-popup`: `max-width: 170px`, `padding: 4px 8px`,
  `font-size: 11px`, `border-radius: 0`.
- Mini badge tags: `[START]` (`.start-tag`, green badge) and `[DEST]`
  (`.dest-tag`, red badge).
- Single-line layout with text-truncation
  (`overflow: hidden; text-overflow: ellipsis;`).

---

## File Modification Summary

| File         | Updates                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `index.css`  | Configured `.maplibregl-popup-content` with 25% opacity background (`rgba(..., 0.25)`), backdrop blur, and `border-radius: 0 !important`. |
| `find.js`    | Updated `getBuildingPopupHTML()` to produce compact mini route badges when routing targets are rendered.                                  |
| `index.html` | Terminal CLI settings layout.                                                                                                             |
