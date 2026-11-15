# ShikshaSetu Frontend Design System

## 1. Overview
The ShikshaSetu user interface is designed for the Department of Technical Education (DTE), Government of Rajasthan. It follows a clean, professional, and accessible **Royal Gold and White** visual identity.

## 2. Design Tokens & Color Palette

| Token Name | Hex Value | CSS Variable | Semantic Usage |
|---|---|---|---|
| **Primary Gold** | `#D4AF37` | `--primary-gold` | Primary actions, brand accents, active indicators, borders |
| **Dark Gold (Hover)** | `#b8972c` | — | Hover state for buttons and clickable accents |
| **Gold Deep Text** | `#8c7322` | — | High-contrast text on light backgrounds |
| **Secondary White** | `#FFFFFF` | `--secondary-white` | Card backgrounds, modals, input fields, navbar body |
| **Light Gray / Neutral** | `#F7F7F7` | `--bg-light` | Page background, table header hover, secondary containers |
| **Warm Tint** | `#FAF8F5` | — | Chat conversation background, highlighting feeds |
| **Border Color** | `#E2E2E2` | `--border-color` | Card borders, dividers, list separators |
| **Charcoal Text** | `#252525` | `--text-charcoal` | Primary headings, titles, body content |
| **Muted Text** | `#555555` / `#666666` | `--text-muted` | Subtitles, helper text, labels |

### Status Colors
- **Safe / Likely / Success**: Text `#2E7D32`, Background `#E8F5E9` / `#F4FBF7`, Border `#C8E6C9`
- **Moderate / Warning**: Text `#E65100` / `#F57C00`, Background `#FFF3E0`, Border `#FFE0B2`
- **Ambitious / Danger**: Text `#C62828` / `#D32F2F`, Background `#FFEBEE`, Border `#FFCDD2`
- **Informational / Blue**: Text `#1976D2`, Background `#E3F2FD`, Border `#BBDEFB`

## 3. Typography & Spacing
- **Font Family**: `'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- **Headings**: Semi-bold to bold (`600`–`800`) with consistent line height (`1.2`–`1.4`).
- **Body**: Regular (`400`–`500`), line height `1.6`.
- **Corner Radii**:
  - `4px` for buttons, inputs, tags.
  - `6px`–`8px` for cards, modals, tables.
- **Shadows**:
  - Base cards: `0 2px 8px rgba(0, 0, 0, 0.04)`
  - Elevated modals: `0 8px 30px rgba(0, 0, 0, 0.15)`

## 4. Reusable Layout Patterns
- **Header Banner**: White card with a `5px solid #D4AF37` left border, uppercase DTE Rajasthan badge, and descriptive subtitle.
- **Form Card**: Responsive grid system with labeled inputs, validation feedback, and clear submit rows.
- **Table Container**: Responsive horizontal scrolling wrapper (`.table-responsive`) with styled headers and status badges.
- **Navigation**: Sticky top navigation bar with brand logo, dynamic role links, and responsive drawer on mobile (`<= 960px`).
