/**
 * GestureBar.tsx — Official Android Gesture Navigation Handle
 *
 * Reference: https://developer.android.com/design/ui/mobile/guides/foundations/system-bars
 *
 * Official design requirements:
 *   - Background MUST be transparent (no opaque bar behind the pill)
 *   - Gesture handle pill: centered, width ~72dp, height 4dp
 *   - Color: onSurfaceVariant at ~40% opacity
 *   - Total container height: ~20dp
 *   - Should not overlap with interactive content
 */

import React from 'react';

/**
 * Renders the transparent gesture navigation handle at the bottom of the screen.
 * This sits below the navigation bar and provides a visual anchor for
 * Android's swipe-up gesture to go home or switch apps.
 */
export const GestureBar: React.FC = () => {
  return (
    <div className="system-gesture-bar" aria-hidden="true">
      <div className="gesture-handle-pill" />
    </div>
  );
};
