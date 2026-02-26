# Design System (Current State)

## Colors

### Primary Palette
- **Primary (Blue):** `hsl(221 83% 53%)` — ~#2563EB. Used for buttons, links, focus rings, badges
- **Primary Foreground:** White — text on primary-colored backgrounds

### Neutrals
- **Background:** White `hsl(0 0% 100%)`
- **Foreground:** Dark gray `hsl(220 14% 10%)` — ~#161B22. Main text color
- **Muted:** Light gray `hsl(220 14% 96%)` — ~#F3F4F6. Used for secondary backgrounds, accent hover
- **Muted Foreground:** Medium gray `hsl(220 9% 46%)` — ~#6B7280. Secondary text, labels, timestamps
- **Border:** Very light gray `hsl(220 13% 91%)` — ~#E5E7EB. All borders

### Semantic
- **Destructive (Red):** `hsl(0 84% 60%)` — ~#EF4444. Delete/revoke buttons, error states
- **Green:** `#16A34A` / `#059669` — Approve button, success status badges
- **Yellow:** `#D97706` — Pending/warning status text

### Status Colors (StatusBadge component)
| Status      | Dot Color     | Text Color     |
|-------------|---------------|----------------|
| connected   | green-500     | green-700      |
| online      | green-500     | green-700      |
| active      | green-500     | green-700      |
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

- **Font:** System default (no custom font loaded)
- **Page titles:** `text-2xl font-bold` (24px, 700)
- **Section headings:** `text-lg font-semibold` (18px, 600)
- **Sub-headings:** `text-sm font-semibold uppercase tracking-wider text-muted-foreground` — used in detail cards like "DETAILS", "POLICIES"
- **Body text:** `text-sm` (14px)
- **Small text / labels:** `text-xs` (12px), often `text-muted-foreground`
- **Monospace:** `font-mono text-xs` — agent IDs, public keys, method names, JSON blocks, log entries

## Spacing

- **Page content:** `max-w-5xl mx-auto px-4 py-6` (1024px max, 16px horizontal padding, 24px vertical)
- **Sections on dashboard:** `space-y-8` (32px between sections)
- **Card list items:** `space-y-2` or `space-y-3` (8-12px between items)
- **Inside cards:** `p-3` or `p-4` (12-16px)

## Border Radius
- **Large (cards, modals):** `rounded-lg` (8px, = `--radius`)
- **Medium (buttons, inputs):** `rounded-md` (6px)
- **Avatars:** `rounded-full`

## Component Patterns

### Buttons
- **Primary:** `bg-primary text-primary-foreground hover:bg-primary/90` — blue bg, white text
- **Destructive:** `text-destructive border border-destructive/30 hover:bg-destructive/10` — outline style
- **Ghost:** `hover:bg-accent text-muted-foreground hover:text-foreground` — icon buttons
- **Approve:** `bg-green-600 text-white hover:bg-green-700`
- **Deny:** `bg-red-600 text-white hover:bg-red-700`
- **All buttons:** `px-3 py-1.5 text-sm font-medium rounded-md` with `inline-flex items-center gap-1.5`
- **Disabled:** `disabled:opacity-50`

### Cards / List Items
- `border border-border rounded-lg p-4` — white card with light border
- Hover state on clickable items: `hover:bg-accent/50 transition-colors`
- Used for: connections list, agents list, approval cards, detail sections

### Inputs
- `px-3 py-2 text-sm border border-input rounded-md bg-background`
- Focus: `focus:outline-none focus:ring-2 focus:ring-ring`

### Empty States
- Centered: icon (w-12 h-12, muted), title (font-semibold), description (text-muted-foreground text-sm), optional action button
- Padded: `py-12 text-center`

### Avatar (Agent initial)
- Circle with first letter: `w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-semibold`
- On dashboard: `w-8 h-8`
- On detail page: `w-12 h-12 text-lg`

### Links
- In-page navigation: `text-sm text-primary hover:underline`
- Back links: `text-sm text-muted-foreground hover:text-foreground` with ArrowLeft icon

## Layout

### Header
- Fixed height: `52px` (`--header-height`)
- White background, bottom border
- Logo left, dropdown menu right
- Approval badge next to menu when pending count > 0

### Page Container
- Below header: `flex-1 overflow-auto`
- Content: `max-w-5xl mx-auto px-4 py-6`

### Navigation
- Hamburger dropdown menu (Radix DropdownMenu), not a sidebar or top tab bar
- Active item: `bg-accent font-medium`
- 6 items + separator + Settings

## Icons
- Library: **lucide-react**
- Size in nav/inline: `w-4 h-4`
- Size in headers: `w-5 h-5`
- Size in empty states: `w-12 h-12`

## Modals
- Full-screen backdrop: `fixed inset-0 z-50 bg-black/50`
- Centered card: `bg-card border rounded-xl shadow-lg p-6 w-full max-w-md mx-4`
- Currently only used for Agent pairing dialog (not Radix Dialog)
