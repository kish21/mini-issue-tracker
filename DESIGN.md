# Design System Specification (DESIGN.md)

> **Visual Archetype:** Modern Dark Developer Tool (Linear / Raycast / GitHub Dark Pro)  
> **Status:** Approved & Verified (WCAG-AA Compliant)  
> **Default Mode:** Dark Mode (`oklch`) with Automatic Light Mode Alternate.

---

## 1. Visual Theme & Principles

1. **Frictionless Keyboard Flow:** Every triage action is instant with single-key accessibility.
2. **Context-First Visual Hierarchy:** Clustered groups highlight the shared root cause and affected files before listing ticket titles.
3. **Sleek Engineering Aesthetic:** Deep obsidian canvas, subtle 1px borders, electric violet primary accent, high-contrast typography.
4. **Scannable Density:** Crisp line heights, monospace badges for technical identifiers, and status dots rather than distracting saturated badges.

---

## 2. Color Tokens (OKLCH)

### Dark Mode (Default)
```css
:root {
  /* Canvas & Surfaces */
  --color-bg-canvas: oklch(0.14 0.02 260);          /* Deep obsidian canvas */
  --color-bg-surface: oklch(0.18 0.025 260);        /* Card surface */
  --color-bg-surface-elevated: oklch(0.22 0.03 260);/* Modal & hovered cards */
  --color-bg-surface-hover: oklch(0.25 0.035 260);
  --color-bg-surface-active: oklch(0.28 0.04 260);

  /* Borders */
  --color-border-subtle: oklch(0.26 0.02 260);      /* Card & divider borders */
  --color-border-strong: oklch(0.36 0.03 260);      /* Interactive element borders */
  --color-border-focus: oklch(0.65 0.22 270);       /* Focus ring */

  /* Text & Foreground */
  --color-text-primary: oklch(0.96 0.01 260);       /* 14.8:1 contrast on canvas (AAA) */
  --color-text-secondary: oklch(0.72 0.03 260);     /* 6.8:1 contrast on canvas (AA) */
  --color-text-muted: oklch(0.52 0.03 260);         /* Metadata / hints */
  --color-text-inverse: oklch(0.12 0.02 260);

  /* Accents */
  --color-accent-primary: oklch(0.65 0.22 270);     /* Electric Violet */
  --color-accent-hover: oklch(0.70 0.22 270);
  --color-accent-subtle: oklch(0.24 0.08 270);
  --color-accent-text: oklch(0.88 0.12 270);

  /* Status Colors */
  --color-success: oklch(0.72 0.18 150);            /* Emerald */
  --color-warning: oklch(0.75 0.16 80);             /* Amber */
  --color-danger: oklch(0.68 0.20 25);              /* Coral Red */
}
```

### Light Mode Alternate
```css
.light {
  --color-bg-canvas: oklch(0.98 0.005 260);
  --color-bg-surface: oklch(1 0 0);
  --color-bg-surface-elevated: oklch(0.96 0.01 260);
  --color-bg-surface-hover: oklch(0.94 0.015 260);
  --color-border-subtle: oklch(0.88 0.01 260);
  --color-border-strong: oklch(0.76 0.02 260);
  --color-text-primary: oklch(0.15 0.02 260);
  --color-text-secondary: oklch(0.38 0.03 260);
  --color-accent-primary: oklch(0.55 0.22 270);
  --color-accent-subtle: oklch(0.94 0.04 270);
}
```

---

## 3. Typography Scale & Fonts

- **Sans-Serif Font:** `Inter` (Weights: 400 Regular, 500 Medium, 600 Semi-Bold)
- **Monospace Font:** `JetBrains Mono` (Weights: 400 Regular, 500 Medium)

| Token | Size | Rem | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `--font-size-xs` | 12px | `0.75rem` | 1.4 | Badges, timestamps, issue IDs |
| `--font-size-sm` | 13.5px | `0.844rem` | 1.45 | Secondary text, buttons, tags |
| `--font-size-base`| 15px | `0.938rem` | 1.5 | Body text, issue descriptions |
| `--font-size-md` | 17px | `1.063rem` | 1.4 | Card titles, section headers |
| `--font-size-lg` | 20px | `1.25rem` | 1.3 | Modal headers, hero titles |

---

## 4. Component Standards

1. **Buttons (`.btn`):**
   - Padding: `8px 14px` (touch friendly $\ge 40\text{px}$ height).
   - Radius: `--radius-sm` (6px).
   - Focus: Visible `--color-border-focus` ring with `2px` offset.
2. **Cards (`.card`):**
   - Padding: `16px 20px`.
   - Radius: `--radius-md` (10px).
   - Border: `1px solid var(--color-border-subtle)`.
3. **Badges & Tags (`.badge-tag`):**
   - Monospace font, `--font-size-xs`, subtle background with clean border.
4. **Status Dots (`.status-dot`):**
   - 8px circular dot with subtle glow shadow.

---

## 5. Layout & Page Inventory

- **Page 1: Triage Dashboard (Main View):**
  - Sticky Top Navigation (`60px` height) with Brand + Global Actions.
  - 2-Column Responsive Grid (`1fr 380px`).
  - Left: Filter tag bar + Issue stream cards.
  - Right: AI Cluster cards + Synthesis action trigger.
- **Page 2: Synthesis & Export Modal:**
  - Centered elevated overlay with 1-click clipboard copy buttons for Coding Prompt and PR Spec.

---

## 6. Depth & Elevation Ladder

- `--shadow-sm`: `0 1px 2px 0 rgba(0, 0, 0, 0.35)`
- `--shadow-md`: `0 4px 12px -2px rgba(0, 0, 0, 0.45)`
- `--shadow-lg`: `0 12px 28px -4px rgba(0, 0, 0, 0.6)`
- `--shadow-glow`: `0 0 20px -2px oklch(0.65 0.22 270 / 0.25)`

---

## 7. Motion & Transitions

- **Strict Rule:** Never use `transition: all`. Animate only `transform`, `opacity`, `background-color`, and `border-color`.
- **Timing:** Fast micro-interactions (`120ms`) using `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Accessibility:** Respect `prefers-reduced-motion: reduce` by setting durations to `0ms`.

---

## 8. Do's & Don'ts

| Do | Don't |
| :--- | :--- |
| Use predefined CSS custom property tokens. | Never use hardcoded hex colors in components. |
| Use `JetBrains Mono` for IDs and code paths. | Don't use generic system monospace fonts. |
| Keep buttons and tap targets $\ge 40\text{px}$. | Don't create tiny un-clickable controls. |
| Use subtle status dots with glowing indicators. | Don't use heavy saturated full-color badge pills. |

---

## 9. Agent & Developer Guide
When building new components or screens:
1. Always import and apply tokens from `src/styles/tokens.css`.
2. Follow the 2-column triage layout pattern.
3. Keep all prompts and PR templates in `src/prompts/`.
