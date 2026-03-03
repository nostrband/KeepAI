# UI Brand Alignment Plan

Align the app UI (`apps/ui`) with the branded landing page (`../keepai-site`) design system.

## Summary of Changes

The app currently uses a **blue primary / pure white / system font** theme. The landing page uses a **red accent / warm off-white / Geist+Inter** theme. This plan brings them together.

## 1. CSS Theme Tokens (`apps/ui/src/index.css`)

Replace HSL color variables with the landing page palette:

| Token | Current (HSL) | New Value | Visual |
|-------|---------------|-----------|--------|
| `--background` | `0 0% 100%` (white) | `#FAF8F7` (warm off-white) | Warm base |
| `--foreground` | `220 14% 10%` | `#111` (bold black) | Darker text |
| `--primary` | `221 83% 53%` (blue) | `#E5372A` (red) | Brand red |
| `--primary-foreground` | white | white | No change |
| `--card` | white | `#FFFFFF` | Pure white (contrast on off-white bg) |
| `--muted` | `220 14% 96%` | `#F5F0EE` | Warm light gray |
| `--muted-foreground` | `220 9% 46%` | `#5A6472` | Warm medium gray |
| `--accent` | `220 14% 96%` | `#F5F0EE` | Same as muted |
| `--border` | `220 13% 91%` | `#E8E4E0` | Warm border |
| `--input` | `220 13% 91%` | `#E8E4E0` | Warm border |
| `--ring` | `221 83% 53%` (blue) | `#E5372A` (red) | Red focus ring |
| `--destructive` | `0 84% 60%` | `#E5372A` | Same as primary (red brand) |
| `--secondary` | `220 14% 96%` | `#F5F0EE` | Warm gray |

Also consider switching from HSL variables to hex/oklch to match the landing page approach.

Add new tokens:
- `--color-brand-light`: `#FFF0EE` — light red tint for icon backgrounds, subtle highlights
- `--color-brand-hover`: `#C62E22` — darker red for hover states

## 2. Typography (`layout + index.css`)

- Load **Geist** (700-900 for headings) and **Inter** (400-600 for body) from Google Fonts
- Set `font-family: 'Inter', -apple-system, sans-serif` on body
- Set headings (`h1`, `h2`, page titles) to `font-family: 'Geist', sans-serif`
- Page titles: bump weight to `font-black` (900) to match landing page boldness

Files to change:
- `apps/ui/index.html` — add Google Fonts `<link>`
- `apps/ui/src/index.css` — set body/heading font families
- `apps/ui/src/components/page-title.tsx` — apply Geist font class

## 3. Border Radius

Bump card radius from `rounded-lg` (8px) to `rounded-xl` (12px) to match landing page cards.

| Element | Current | New |
|---------|---------|-----|
| Cards/sections | `rounded-lg` | `rounded-xl` |
| Buttons | `rounded-md` | `rounded-lg` |
| Inputs | `rounded-md` | `rounded-xl` |
| Modals | `rounded-xl` | `rounded-2xl` |
| Badges/pills | varies | `rounded-full` |

Update `--radius` from `0.5rem` to `0.75rem` in the theme to cascade.

## 4. Button Styles

Update primary buttons across the app:

**Primary (was blue, now red):**
- `bg-[#E5372A] text-white hover:bg-[#C62E22]`
- Add `shadow-sm` or `shadow-lg shadow-[#E5372A]/20` on prominent CTAs

**Secondary (outline):**
- `border border-[#D1CBC4] bg-white text-[#111] hover:border-[#111]`

**Destructive**: Already red — may need to differentiate from primary. Options:
- Keep destructive as outline-style: `text-[#E5372A] border border-[#E5372A]/30 hover:bg-[#E5372A]/10`
- Primary is solid red, destructive is outline red — this already works

These will mostly cascade from the CSS variable changes, but review hardcoded blue classes.

## 5. Card & List Item Styles

- Cards: add `shadow-sm` alongside border for subtle depth (landing page pattern)
- Hover on clickable cards: `hover:shadow-md hover:border-[#D1CBC4] transition-all`
- Feature/icon backgrounds: use `bg-[#FFF0EE]` with `text-[#E5372A]` for service icons, agent avatars

Update components:
- Agent avatar circle: `bg-primary/10 text-primary` stays (will auto-update since primary changes to red)
- Service icons in connection cards
- Approval cards
- All list items across pages

## 6. Header

- Add glassmorphism: `bg-white/80 backdrop-blur-md` (landing page nav style)
- Beta badge already uses `#E5372A` — good, no change needed
- Logo accent should match brand red

## 7. Input Fields

- Increase padding slightly: `px-4 py-3` (was `px-3 py-2`)
- Increase radius: `rounded-xl` (was `rounded-md`)
- Focus state: `focus:border-[#111] focus:ring-2 focus:ring-[#111]/10` (landing page uses black focus, not red)

## 8. Status Colors — No Change

Keep semantic status colors (green/yellow/red/gray) as-is. These are functional, not brand.

## 9. Empty States

- Icon containers: use `bg-[#FFF0EE] text-[#E5372A]` backgrounds (was bare muted icons)
- Slightly warmer feel

## 10. Shadows

Add shadow usage where landing page uses them:
- Cards: `shadow-sm`
- Hovered cards: `shadow-md`
- Modals: `shadow-2xl`
- Primary CTA buttons: `shadow-lg shadow-[#E5372A]/20`

## Files to Modify

| File | Changes |
|------|---------|
| `apps/ui/index.html` | Add Google Fonts link (Geist + Inter) |
| `apps/ui/src/index.css` | Replace all color tokens, update radius, add font families, add brand-light token |
| `apps/ui/src/components/header.tsx` | Glassmorphism background, update any hardcoded colors |
| `apps/ui/src/components/page-title.tsx` | Geist font on headings |
| `apps/ui/src/components/approval-card.tsx` | Card shadow, radius, button colors |
| `apps/ui/src/components/status-badge.tsx` | No change (semantic colors) |
| `apps/ui/src/components/service-icon.tsx` | Icon container background to brand-light |
| `apps/ui/src/components/empty-state.tsx` | Icon container update |
| `apps/ui/src/components/add-agent-dialog.tsx` | Modal radius, input styles, button colors |
| `apps/ui/src/components/connect-app-dialog.tsx` | Modal radius, button colors |
| `apps/ui/src/pages/dashboard.tsx` | Card shadows, radius updates |
| `apps/ui/src/pages/connections.tsx` | Card shadows, radius |
| `apps/ui/src/pages/agents.tsx` | Card shadows, radius |
| `apps/ui/src/pages/agent-detail.tsx` | Card shadows, radius, section headers |
| `apps/ui/src/pages/app-detail.tsx` | Card shadows, radius |
| `apps/ui/src/pages/permissions.tsx` | Card shadows, radius |
| `apps/ui/src/pages/approvals.tsx` | Card shadows, radius |
| `apps/ui/src/pages/logs.tsx` | Table styling, radius |
| `apps/ui/src/pages/settings.tsx` | Input styles, card radius |

## Non-Goals

- Dark mode (landing page doesn't have it either)
- Scroll animations / fade-ups (overkill for an app)
- Pricing section styles (not applicable)
- Gradient backgrounds (keep simple for app context)
