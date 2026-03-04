# Design System (Current State)

## Colors

### Primary Palette
- **Primary (Red):** `#E5372A` — Brand red. Used for buttons, links, focus rings, badges
- **Primary Hover:** `#C62E22` — Darker red for hover states
- **Primary Foreground:** White — text on primary-colored backgrounds
- **Brand Light:** `#FFF0EE` — Light red tint for icon backgrounds, subtle highlights

### Neutrals
- **Background:** `#FAF8F7` (warm off-white). Page background
- **Foreground:** `#111111` (bold black). Main text color
- **Card:** `#FFFFFF` (pure white). Card backgrounds, stands out on off-white
- **Muted:** `#F5F0EE` (warm light gray). Secondary backgrounds, accent hover
- **Muted Foreground:** `#5A6472` (warm medium gray). Secondary text, labels, timestamps
- **Border:** `#E8E4E0` (warm light border). All borders
- **Input:** `#E8E4E0`. Input field borders

### Semantic
- **Destructive (Red):** `#E5372A` — Same as primary. Delete/revoke buttons, error states
- **Green:** `#16A34A` / `#059669` — Approve button, success status badges
- **Yellow:** `#D97706` — Pending/warning status text

### Status Colors (StatusBadge component)
| Status      | Dot Color     | Text Color     |
|-------------|---------------|----------------|
| connected   | green-500     | green-700      |
| online      | green-500     | green-700      |
| active      | green-500     | green-700      |
| paused      | yellow-500    | yellow-700     |
| pending     | yellow-500    | yellow-700     |
| offline     | gray-400      | gray-600       |
| error       | red-500       | red-700        |
| revoked     | red-500       | red-700        |

### Service Colors (ServiceIcon component)
| Service | Icon      | Color    |
|---------|-----------|----------|
| Gmail   | Mail      | red-500  |
| Notion  | FileText  | gray-700 |
| Default | Globe     | gray-400 |

## Typography

- **Headings Font:** Geist (via Google Fonts), weights 700-900
- **Body Font:** Inter (via Google Fonts), weights 400-600
- **Fallback:** `-apple-system, BlinkMacSystemFont, sans-serif`
- **Page titles:** `text-2xl font-black` (24px, 900) — Geist
- **Section headings:** `text-lg font-semibold` (18px, 600) — Geist
- **Sub-headings:** `text-sm font-semibold uppercase tracking-wider text-muted-foreground` — used in detail cards
- **Body text:** `text-sm` (14px) — Inter
- **Small text / labels:** `text-xs` (12px), often `text-muted-foreground`
- **Monospace:** `font-mono text-xs` — agent IDs, public keys, method names, JSON blocks, log entries

## Spacing

- **Page content:** `max-w-5xl mx-auto px-4 py-6` (1024px max, 16px horizontal padding, 24px vertical)
- **Sections on dashboard:** `space-y-8` (32px between sections)
- **Card list items:** `space-y-2` or `space-y-3` (8-12px between items)
- **Inside cards:** `p-4` (16px)

## Border Radius
- **XL (modals):** `rounded-2xl` (16px)
- **Large (cards, sections):** `rounded-xl` (12px, = `--radius`)
- **Medium (buttons):** `rounded-lg` (8px)
- **Inputs:** `rounded-xl` (12px)
- **Avatars/badges:** `rounded-full`

## Component Patterns

### Buttons
- **Primary:** `bg-primary text-primary-foreground hover:bg-brand-hover` — red bg, white text
- **Destructive:** `text-destructive border border-destructive/30 hover:bg-destructive/10` — outline style
- **Ghost:** `hover:bg-accent text-muted-foreground hover:text-foreground` — icon buttons
- **Approve:** `bg-green-600 text-white hover:bg-green-700`
- **Deny:** `bg-red-600 text-white hover:bg-red-700`
- **All buttons:** `px-3 py-1.5 text-sm font-medium rounded-lg` with `inline-flex items-center gap-1.5`
- **Disabled:** `disabled:opacity-50`

### Cards / List Items
- `border border-border rounded-xl p-4 bg-card shadow-sm` — white card with warm border and subtle shadow
- Hover state on clickable items: `hover:shadow-md hover:border-[#D1CBC4] transition-all`
- Used for: connections list, agents list, approval cards, detail sections

### Inputs
- `px-4 py-3 text-sm border border-input rounded-xl bg-background`
- Focus: `focus:outline-none focus:ring-2 focus:ring-ring/10 focus:border-foreground`

### Empty States
- Icon container: `w-16 h-16 rounded-2xl bg-brand-light text-primary` with icon centered
- Title: `font-medium`
- Description: `text-muted-foreground text-sm`
- Padded: `py-16 text-center`

### Avatar (Agent initial)
- Circle with first letter: `w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-semibold`
- On dashboard: `w-8 h-8`
- On detail page: `w-12 h-12 text-lg`

### Links
- In-page navigation: `text-sm text-primary hover:underline`
- Back links: `text-sm text-muted-foreground hover:text-foreground` with ChevronLeft icon

## Layout

### Header
- Fixed height: `52px` (`--header-height`)
- Glassmorphism: `bg-white/80 backdrop-blur-md`, bottom border
- Logo left, dropdown menu right
- Approval badge next to menu when pending count > 0

### Page Container
- Below header: `flex-1 overflow-auto`
- Content: `max-w-5xl mx-auto px-4 py-6`

### Navigation
- Hamburger dropdown menu (Radix DropdownMenu), not a sidebar or top tab bar
- Active item: `bg-accent font-medium`
- 5 items + separator + Settings

## Icons
- Library: **lucide-react**
- Size in nav/inline: `w-4 h-4`
- Size in headers: `w-5 h-5`
- Size in empty states: `w-12 h-12`

## Modals
- Full-screen backdrop: `fixed inset-0 z-50 bg-black/50`
- Centered card: `bg-card border rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4`

## Shadows
- Cards/sections: `shadow-sm`
- Hovered cards: `shadow-md`
- Modals: `shadow-2xl`
