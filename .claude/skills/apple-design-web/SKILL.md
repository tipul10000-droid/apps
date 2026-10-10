---
name: apple-design-web
description: Apple Human Interface Guidelines (HIG) rules for designing and reviewing mobile-first web apps and iOS-style UI. Use when designing or fixing layout, typography, color, touch targets, navigation, motion, dark mode, safe areas, home-screen web apps (PWA) on iPhone, notifications, right-to-left (Hebrew) layout, or accessibility. Rules are tagged (HIG) when verified from Apple's published guidelines, or (practice) when they are web/engineering advice that is not from the HIG.
---

# Apple design (HIG) for web apps

## Sources and verification status (read first)
- **(HIG)** = taken from Apple's published Human Interface Guidelines, downloaded from `developer.apple.com/design/human-interface-guidelines/<page>` on 2026-10-06. Pages used: layout, typography, accessibility, color, dark-mode, materials, motion, buttons, sheets, alerts, onboarding, privacy, gestures, notifications, tab-bars, toolbars, right-to-left, app-icons. Re-check the live page before relying on a number for anything important.
- **(practice)** = web/CSS/PWA engineering advice from experience. It is NOT from the HIG. `webkit.org` could not be reached when this file was written, so the WebKit-specific items (safe-area CSS, home-screen web apps, iOS Web Push) are not verified against an official page.
- Apple's iOS system color hex values are published as images, not text, so they are intentionally NOT listed here. Apple also says not to hard-code them (color page). Use semantic/system colors and approximate on the web.
- Apple's HIG is a native-app guide. On the web, apply the principles and the numeric minimums; mimic native components only where it helps.

## 1. Principles
- (HIG) Order content by importance: most important near the top and the leading side (reading order). Align elements, use indentation for hierarchy, group related items, and use progressive disclosure (menus, nested views, scrollable sections) instead of showing everything at once.
- (HIG) Differentiate controls from content. Avoid placing a solid or semi-opaque background under controls; let controls float above content (scroll-edge effect / Liquid Glass on native). Extend full-screen background content under bars.
- (HIG) Prefer familiar system patterns and components over custom ones.

## 2. Layout, safe areas, adaptability
- (HIG) A safe area is the area not covered by hardware features (Dynamic Island) or UI like toolbars, tab bars and the status bar. Respect it so nothing important is obstructed.
- (HIG) Design for different screen sizes, orientations, text-size changes, the Dynamic Island, Display Zoom and locales (including right-to-left). Decide layout from available space (size classes), not from device type or orientation. Keep functionality the same when space changes.
- (HIG) Test the largest and smallest layouts first, in multiple localizations and text sizes.
- (practice) Web: `viewport-fit=cover` + `env(safe-area-inset-top|right|bottom|left)`. In a home-screen web app with a translucent status bar, content can run under the status bar and under the blurred zone below it; keep controls clear of that blur, not just clear of the clock. Some devices report `0` for the inset in standalone mode: measure at runtime and fall back by screen size.
- (practice) Use `100dvh` instead of `100vh`. Test 375x667 (SE), 390x844, 430x932 (Pro Max).
- (practice) Common spacing habit: 8 pt grid, 16 pt side margins. Apple's layout page does not specify these numbers.

## 3. Touch targets, spacing, gestures
- (HIG, accessibility page) iOS control size: **default 44x44 pt, minimum 28x28 pt**. Aim for 44; never go below 28.
- (HIG) Spacing matters as much as size: about **12 pt of padding around elements with a bezel**, about **24 pt around elements without a bezel** (visible edges).
- (HIG, buttons) Always include a pressed state on custom buttons. Use a prominent style for the most likely action; use style, not size, to mark the preferred choice. Label with a verb. Do not give the primary role to a destructive action.
- (HIG, gestures) Give more than one way to do things; respond consistently with expectations and immediately; indicate when a gesture is unavailable; custom gestures must not be the only way to do something important; avoid conflicting with system gestures.
- (HIG, accessibility) Prefer simple gestures; always offer an on-screen alternative to a gesture (for example a button as well as a swipe).
- (practice) `touch-action: manipulation` and `maximum-scale=1` stop accidental double-tap zoom. Fixed header/footer + one scrolling content area (`overflow-y:auto; overscroll-behavior:contain`); block drag on the fixed chrome. Show a one-time hint when content continues below the fold.

## 4. Typography
- (HIG) Default text size on iOS: **17 pt**; minimum **11 pt**. Avoid Ultralight/Thin/Light weights; prefer Regular, Medium, Semibold, Bold.
- (HIG) Default iOS text styles (size/leading, pt): Large Title 34/41, Title 1 28/34, Title 2 22/28, Title 3 20/25, Headline 17/22 semibold, Body 17/22, Callout 16/21, Subhead 15/20, Footnote 13/18, Caption 1 12/16, Caption 2 11/13.
- (HIG) Convey hierarchy with weight, size and color; minimize the number of typefaces; keep hierarchy when text size changes; prioritize important content when text grows (not every label must scale).
- (HIG) Support Dynamic Type: let people enlarge text at least **200%**; avoid truncation (use more lines); stack inline items vertically at large sizes; increase meaningful icon size with text; keep primary elements near the top.
- (HIG) The system typeface is San Francisco (includes **SF Hebrew** and rounded variants). With a custom font, follow the same size minimums and support Bold Text/Dynamic Type equivalents.
- (practice) Web: `font-family: -apple-system, system-ui, "SF Pro Text", sans-serif`; use `rem`/`clamp()`; `font-size >= 16px` on inputs to avoid zoom on focus.

## 5. Color and dark mode
- (HIG, accessibility) Minimum contrast (WCAG AA as used by Accessibility Inspector): text up to 17 pt needs **4.5:1**; 18 pt text **3:1**; bold text **3:1**. Check both light and dark appearances; provide higher contrast for Increase Contrast.
- (HIG) Do not rely on color alone: add icon, shape or text. Red/green and blue/orange are especially hard for color-blind people. Colors can mean different things in different cultures.
- (HIG, color) Use the same color for the same meaning everywhere. Test light, dark and increased-contrast, in different lighting and on different displays. Avoid hard-coding system color values (they change between releases).
- (HIG, dark-mode) Support Light, Dark and Auto; **do not add an app-specific appearance setting**. Dark palette uses dimmer backgrounds and brighter foregrounds; layered surfaces use "base" and "elevated" backgrounds. Keep contrast at least 4.5:1. Soften images with white backgrounds so they do not glow.

## 6. Materials and icons
- (HIG, materials) Translucent "glass" is for the controls/navigation layer floating above content; do **not** use it in the content layer, and use it sparingly. Standard materials (ultra-thin, thin, regular, thick): thicker = better contrast for fine text; thinner = more context. Over bright content a clear glass control may need a ~35% dark dimming layer.
- (HIG, app-icons) iOS app icon master: **1024x1024 px**, square (the system rounds the corners), layered, with dark/clear/tinted variants. Provide unmasked square layers, keep key content centered, prefer vector, avoid soft/feathered edges in foreground layers.
- (practice) Web apps: `apple-touch-icon` 180x180, opaque, no transparency; manifest icons 192/512.

## 7. Navigation and structure
- (HIG, tab-bars) A tab bar is for navigation, not actions; keep it visible; do not disable or hide tabs; label tabs; avoid overflow tabs; badges only for critical info.
- (HIG, toolbars) Do not overcrowd toolbars; use a More menu for extra actions; prefer standard components; reduce custom backgrounds and tinted controls.
- (HIG, sheets) Sheets are for focused, simple tasks. Cancel/Close dismisses without saving; Done confirms; Back is for steps, not dismissing. One sheet at a time; do not show Cancel, Done and Back together; always pair Done with Cancel.
- (HIG, alerts) Use alerts sparingly; not just for information; not at app start; not for common undoable actions. Direct, neutral, specific title; short optional text; up to three buttons.
- (HIG, onboarding) Fast, fun and optional; teach by doing; prefer contextual tips over a long flow; show a permission request in context or in onboarding; do not ask for ratings/purchases before people have used the app.
- (HIG, privacy) Request only data you need, only when needed; explain why before the system prompt.

## 8. Notifications
- (HIG) Get consent first. Be concise and informative; short title; complete sentences; do not include sensitive info.
- (HIG) Avoid sending multiple notifications for the same thing; avoid notifications that merely tell people to perform a task in the app (offer simple actions in the notification instead when possible); use an alert, not a notification, for errors; handle foreground state gracefully.
- (practice, not HIG) iOS web apps: Web Push works for a web app **added to the Home Screen** (iOS 16.4+). Call `Notification.requestPermission()` directly from the click handler (no `await` first). Every push must show a notification. Remove dead subscriptions on 404/410.

## 9. Motion
- (HIG) Add motion with purpose; make it optional; keep feedback animations brief; avoid motion on very frequent interactions; do not make people wait for an animation.
- (HIG, accessibility) Respect Reduce Motion: reduce automatic/repetitive animation, zooming and scaling; tighten springs, track gestures directly, replace x/y/z transitions with fades, avoid animating into and out of blurs. Avoid flashing and fast blinking.
- (HIG, accessibility) Minimize time-boxed UI (things that auto-dismiss on a timer); prefer dismissing with an explicit action.
- (practice) Animate `transform`/`opacity`; honor `prefers-reduced-motion`; reserve space so layout does not jump when state or text changes.

## 10. Accessibility checklist
- (HIG) Larger text (>= 200%), contrast ratios above, controls >= 28 pt (aim 44), more than color alone, simple gestures plus alternatives, VoiceOver labels for interface elements, Reduce Motion, Increase Contrast, keyboard / Switch Control support, minimal cognitive load (one main task per screen, confirm twice for hard-to-recover actions).
- (practice) Web: semantic HTML, `aria-label` on icon buttons, `alt` text, `aria-hidden` on decoration, headings in order, visible focus.

## 11. Right-to-left (Hebrew)
- (HIG, right-to-left) Align text to the interface direction; align a paragraph (3+ lines) by its own language; keep one alignment for all items in a list.
- (HIG) Never reverse the digits inside a number; Hebrew uses Western Arabic numerals. Reverse the order of numerals that show progress or counting direction.
- (HIG) **Flip** controls that show progress (sliders, progress bars) and navigation in a fixed order: **in RTL a back button must point right**; next/previous flip too. Do not flip controls that mean a real direction ("to the right").
- (HIG) Do not flip photographs, illustrations, logos, checkmarks, clocks or other real-world object icons. Flip icons that show text/reading direction or forward/backward motion. Reverse the order of images when the order is meaningful.
- (HIG) Hebrew text can look small beside uppercase Latin; increase the Hebrew size by about 2 pt when balancing them.
- (practice) `dir="rtl"`, logical CSS properties (`margin-inline-start`, `inset-inline-end`, `text-align:start`), `unicode-bidi: isolate` for mixed text, correct Hebrew final letters and construct state in UI strings, gendered verbs where the user is known.

## 12. Home-screen web app (PWA) notes (practice, unverified against an official page)
- `manifest.json` (`name`, `short_name`, `start_url`, `scope`, `display: standalone`, icons), `apple-touch-icon`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style` (`black-translucent` lets content run under the status bar), `viewport-fit=cover`.
- Home-screen app storage on iOS is separate from Safari. The name and icon are fixed when the app is added; re-add to see changes.
- Cache-bust scripts/styles (`?v=...`) and show a small build number so you can confirm which version loaded.
- Prevent rubber-banding of fixed chrome: `html, body { position: fixed; inset: 0; overflow: hidden; overscroll-behavior: none }`, and scroll only inside a content container.

## 13. Review checklist
1. Tested at 375x667, 390x844, 430x932; nothing under the status bar zone, Dynamic Island or home indicator.
2. Controls >= 44 pt (never < 28); ~12 pt around bezeled controls.
3. Body text >= 17 pt where possible, never < 11 pt; hierarchy with <= 3 levels; Dynamic-Type-friendly.
4. Contrast 4.5:1 (3:1 for 18 pt+ and bold); works in dark mode; color is not the only signal.
5. One clear primary action; visible back/close; pressed states on custom buttons.
6. No layout jumps; Reduce Motion respected; no needless auto-dismiss.
7. RTL correct (alignment, flipped back arrow, digits not reversed, images not flipped).
8. Fixed chrome stays fixed; only the content scrolls; hints for hidden content.
9. Screenshot at phone size and look at it before declaring done.

## 14. Priority when rules conflict
Accessibility and safety first, then the user's explicit request, then the HIG, then taste. A playful brand look is fine as long as legibility, target size and contrast stay within the minimums above.

## Change log
- 2026-10-06: rebuilt from the published HIG pages. Corrections to the first draft: 44x44 pt is the **default** iOS control size and **28x28 pt** is the minimum; 8 pt grid, 16 pt margins and corner-radius numbers are not stated in the HIG (now marked practice); system color hex values removed (not published as text).
