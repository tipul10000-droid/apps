---
name: apple-design
description: Apple design rules and Human Interface Guidelines (HIG) for building and reviewing mobile-first web apps and iOS-style UI. Use when designing or fixing layouts, typography, color, spacing, touch targets, navigation, motion, dark mode, safe areas, home-screen web apps (PWA) on iPhone, or accessibility. Includes web/CSS equivalents of native iOS behavior and RTL (Hebrew) notes.
---

# Apple design (HIG) for web apps

Use this when you design, build or review UI that should feel native on iPhone (Safari and "Add to Home Screen" apps). The rules come from Apple's Human Interface Guidelines. Each section ends with how to apply it on the web.

## 1. Core principles
- **Clarity**: text is legible at every size, icons are precise, the purpose of each element is obvious.
- **Deference**: the UI helps people focus on content. Chrome is light; content is the star.
- **Depth**: layers, translucency and motion explain hierarchy and navigation.
- One primary action per screen. Remove anything that does not help the main task.
- Consistency: reuse standard patterns people already know instead of inventing new ones.

## 2. Layout and spacing
- Design for the **safe area**. Never put controls under the status bar, Dynamic Island, home indicator or rounded corners.
  - Web: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, then pad with `env(safe-area-inset-top|right|bottom|left)`.
  - In a home-screen web app, `apple-mobile-web-app-status-bar-style: black-translucent` lets content run under the status bar, so the top inset MUST be respected. Some iPhones report `0` in standalone mode; measure `env()` at runtime and fall back to a per-device value if it is `0`.
  - Keep controls clear of the translucent/blurred status-bar zone (status bar + a little extra).
- Use an **8 pt grid** (4 pt for fine adjustments). Standard side margins are 16 pt (20 pt on larger phones). Keep spacing consistent and generous.
- Group related items, separate unrelated ones with space (not lines).
- Use full-height layouts with `100dvh`, not `100vh` (the dynamic toolbar changes the viewport).
- Align to a clear grid. Do not let content get cramped against edges.
- Support both orientations and all iPhone sizes (SE 375x667 up to Pro Max 430x932). Test the smallest and the largest.

## 3. Touch targets and interaction
- **Minimum tap target 44x44 pt.** Space targets at least 8 pt apart.
- Put primary actions where thumbs reach (bottom half). Put back/secondary actions in the top corner.
- Give instant feedback on touch (pressed state, light scale 0.96-0.98). Never rely on hover.
- Prevent accidental zoom: `touch-action: manipulation`, `maximum-scale=1`; avoid double-tap-to-zoom surprises.
- Do not hijack system gestures (edge swipe back, home swipe, pull to refresh) without a clear reason.
- Prefer taps and standard scrolling over hidden or complex gestures. If a gesture is the only way to do something, also offer a visible control.
- Pin fixed headers/footers and let only the content area scroll (`overflow-y: auto; overscroll-behavior: contain`). Block rubber-banding on the fixed chrome.
- Scroll hints: if content continues below the fold, show a subtle cue (it disappears after the first scroll).

## 4. Typography
- Use the system font. Web: `font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif;`. (For Hebrew, Apple's system font falls back to Arial Hebrew / SF Hebrew; a rounded web font such as Rubik is an acceptable choice for playful apps.)
- Type scale (iOS defaults, pt): Large Title 34, Title 1 28, Title 2 22, Title 3 20, Headline 17 semibold, Body 17, Callout 16, Subhead 15, Footnote 13, Caption 12 / 11.
- Body text never below 17 pt for reading, 11 pt absolute minimum for captions.
- Use weight and size for hierarchy, not many fonts or colors. Two or three levels per screen.
- Support **Dynamic Type**: use relative units (`rem`, `em`, `clamp()`), let text wrap, never truncate essential text, avoid fixed-height text containers.
- Line height around 1.2-1.4 for UI text. Left/right alignment follows the reading direction; avoid centered paragraphs.
- Keep line length comfortable (about 40-75 characters).

## 4a. Hebrew and RTL
- Set `<html lang="he" dir="rtl">`. Use **logical properties** (`margin-inline-start`, `padding-inline-end`, `inset-inline`, `text-align: start`) so layouts mirror correctly.
- Mirror directional UI: back arrows point right in RTL (but when a design explicitly places a back arrow on the left, follow the design), progress bars fill right to left, lists start on the right.
- Do NOT mirror: media controls (play), numerals, logos, clocks, photos, and icons that depict real objects.
- Mixed text: put Latin words, numbers and punctuation inside RTL text carefully (use `<bdi>` or `unicode-bidi: isolate`); avoid Latin abbreviations next to Hebrew when the order may flip. Use Hebrew final letters correctly (ץ ך ם ן ף only at the end of a word).
- Hebrew grammar in UI text: use gender-aware verbs where the user is known (בחר / בחרה), and construct state correctly (ריבת תות).

## 5. Color
- Use a small palette: one accent (tint) color for interactive elements, plus neutrals. Color must not be the only way to convey meaning (add icon, text or shape).
- Contrast: at least **4.5:1** for normal text, **3:1** for large text and UI components (WCAG AA). Aim higher on dark backgrounds with small text.
- Support **Dark Mode** and **Light Mode** (`prefers-color-scheme`). Do not use pure `#000` text on pure `#fff`; use semantic colors (label, secondaryLabel, separator, systemBackground, secondarySystemBackground).
- iOS system colors (light/dark): blue #007AFF/#0A84FF, green #34C759/#30D158, red #FF3B30/#FF453A, orange #FF9500/#FF9F0A, yellow #FFCC00/#FFD60A, pink #FF2D55/#FF375F, purple #AF52DE/#BF5AF2, teal #5AC8FA/#64D2FF.
- Use red for destructive actions and green for success only. Avoid red/green as the only difference.
- Status indicators: pair color with text (for example a red dot with "Off" and a green dot with "On").
- Elevated surfaces in dark mode are slightly lighter, not darker.

## 6. Materials, depth and iconography
- Use translucency (blur) sparingly for bars and sheets: `backdrop-filter: blur(20px) saturate(1.8)` with a semi-transparent background; provide an opaque fallback when `backdrop-filter` is unsupported.
- Corner radius: continuous (squircle-like) corners. Typical: 10-12 pt for controls, 16-20 pt for cards, 24+ for sheets. Nested radii: inner radius = outer radius minus padding.
- Shadows: soft and low-contrast. Prefer subtle borders/strokes in dark mode.
- Icons: consistent stroke weight and optical size; align to text baseline; use SF Symbols style (simple, monoline, rounded). Do not mix filled and outlined styles in one row without meaning.
- App icon: full-bleed square (iOS rounds the corners itself), no transparency, simple central subject, no text, 1024x1024 master. For web apps also provide `apple-touch-icon` 180x180.

## 7. Navigation and structure
- Prefer a clear hierarchy: **tab bar** (3-5 top-level destinations, at the bottom) or **navigation stack** (push/pop with a back button at the top leading edge).
- Back button: top leading edge, labeled with the previous screen's title or "Back".
- Titles are short. Use a large title at the top of a root screen; it shrinks on scroll.
- **Modals/sheets** are for focused, temporary tasks. Always provide a clear way to close (X or Done) and allow swipe-down to dismiss where it does not lose data.
- Do not nest more than two levels of modal. Do not use alerts for non-critical information; use inline messages or toasts.
- Alerts: short title, one-sentence message, 2 buttons max when possible; the destructive action is clearly marked and never the default.
- Onboarding: minimal, skippable, show value fast; ask for permissions (notifications, location, camera) in context, right when the feature is needed, and explain why first.

## 8. Controls and components
- Buttons: filled for the primary action, tinted/plain for secondary. Label with a verb. Minimum 44 pt height. Disabled state is visibly reduced (opacity ~0.4) and not tappable.
- Lists: rows at least 44 pt, leading icon/avatar, trailing detail/chevron; separators inset to the text.
- Selection: show the selected state with more than color (checkmark, border, filled background).
- Text fields: 17 pt text (prevents iOS from zooming on focus: use `font-size >= 16px` on inputs), clear labels, helpful keyboard type (`inputmode`, `autocomplete`), and an inline error message next to the field.
- Toggles/switches for immediate on/off settings. Segmented controls for 2-5 mutually exclusive views.
- Empty states: explain what is missing and offer the next action.
- Loading: show progress for anything over about 1 second (skeleton or spinner); keep the UI responsive; avoid blocking the whole screen.

## 9. Motion and feedback
- Motion has purpose: explain a change, give feedback, or guide attention. Keep it quick (150-350 ms) and natural (ease-out for entering, ease-in for leaving, springs for direct manipulation).
- Animate `transform` and `opacity` only (GPU friendly). Avoid layout-shifting animations.
- **Respect `prefers-reduced-motion`**: replace large motion with fades or nothing.
- Celebrations and confetti are fine for delight in playful apps; keep them short, non-blocking, and skippable.
- Haptics are native-only; on the web use clear visual feedback instead.
- Do not move content under the user's finger; reserve space so layouts do not jump when text or state changes (for example reserve two lines for a status message).

## 10. Accessibility (required, not optional)
- Every tap target at least 44x44 pt. Every control has an accessible name (`aria-label`) and role.
- Contrast ratios as above. Do not convey meaning by color alone.
- Support Dynamic Type / user font scaling, VoiceOver (semantic HTML, headings in order, labels on icon buttons, `alt` on meaningful images, `aria-hidden` on decorative ones), Reduce Motion, Reduce Transparency (opaque fallback), Bold Text, and Increase Contrast.
- Focus order follows reading order. Do not trap focus.
- Do not rely on gestures or hover alone.
- Text alternatives for icons and emoji that carry meaning.

## 11. Privacy, permissions and trust
- Ask for permission only when needed and explain the benefit first. Handle "denied" gracefully with instructions to change it in Settings.
- Collect the minimum data. Do not require an account for a simple task.
- Never put secrets in client code. Public/anon keys only.

## 12. Home-screen web app (PWA) checklist for iPhone
- `manifest.json` with `name`, `short_name`, `start_url`, `scope`, `display: "standalone"`, `background_color`, `theme_color`, icons 192/512.
- `<link rel="apple-touch-icon" href="apple-touch-icon.png">` (180x180, opaque, no transparency).
- `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-title" content="...">`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`, `viewport-fit=cover`, `theme-color`.
- Home-screen app storage on iOS is separate from Safari: users pick a profile/choice again once after installing.
- Web Push works on iPhone only for a web app that was **added to the Home Screen** (iOS 16.4+). Request permission from a user gesture, directly in the click handler (no `await` before `Notification.requestPermission()`). Always show a notification for every push (a service worker `push` handler must call `showNotification`).
- Name and icon are fixed when the app is added; to see a new name/icon, remove and re-add the app.
- Service worker, manifest and static files can be cached aggressively: add a version query (`?v=...`) to scripts/styles and show the version somewhere small so you can confirm which build is loaded.
- Disable rubber-banding on fixed chrome: `html, body { position: fixed; inset: 0; overflow: hidden; overscroll-behavior: none }` and scroll only inside a content container.

## 13. Review checklist (run before finishing)
1. Tested at 375x667, 390x844, 430x932; nothing under the status bar / Dynamic Island / home indicator.
2. Tap targets >= 44 pt; 8 pt spacing between them.
3. Text >= 16-17 pt for body; inputs >= 16 px; hierarchy uses at most 3 levels.
4. Contrast AA; dark mode works; color is not the only signal.
5. One clear primary action per screen; back/close always visible.
6. No layout jumps when state/text changes; reduced-motion respected.
7. RTL correct (logical properties, mirrored directional icons, correct bidi).
8. Accessible names on all icon buttons; headings in order.
9. Fixed header/footer do not scroll; only the content scrolls; hints for hidden content.
10. Screenshot the result at phone size and look at it before declaring done.

## 14. When rules conflict
Follow this priority: accessibility and safety first, then the user's explicit request, then Apple's HIG, then personal taste. If a brand or playful style conflicts with the HIG, keep the playful look but never at the cost of legibility, tap size, or contrast.
