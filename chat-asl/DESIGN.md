# Design System Strategy: The Fluid Mentor

## 1. Overview & Creative North Star

The "Creative North Star" for this design system is **The Fluid Mentor**. ASL is a language of motion, space, and expression; the interface must reflect this by moving away from the static, "boxy" nature of traditional educational software.

We avoid the "template" look by utilizing intentional asymmetry, oversized radii, and a layout that breathes. Instead of rigid grids, we use **Dynamic Flow**—where learning modules "float" on a canvas of soft lavender, utilizing overlapping elements and varied typography scales to guide the eye. This system is designed to feel high-end and editorial, treating every lesson like a featured story rather than a row in a database.

---

## 2. Colors & Surface Architecture

The palette is a sophisticated blend of deep energetic violets and soft, airy neutrals. It prioritizes accessibility without sacrificing vibrancy.

### The "No-Line" Rule

Standard 1px borders are strictly prohibited for defining sections. Boundaries must be established through **Color Blocking** and **Tonal Shifts**.

- A lesson module (`surface-container-lowest`) sits on a workspace (`surface-container-low`), which sits on the global `background`.
- Contrast is achieved through the proximity of different surface tokens, creating a clean, high-end feel that reduces visual noise.

### Surface Hierarchy & Nesting

Treat the UI as a series of physical layers:

- **Base Layer:** `background` (#faf4ff) – The primary canvas.
- **Section Layer:** `surface-container-low` (#f4eeff) – Used for grouping related content blocks.
- **Content Layer:** `surface-container-lowest` (#ffffff) – Used for individual cards or interactive modules. This creates a "lift" through color alone.

### The "Glass & Gradient" Rule

To add soul and professional polish:

- **CTAs:** Use a subtle linear gradient from `primary` (#4647d3) to `primary-container` (#9396ff) at a 135-degree angle.
- **Floating Elements:** Use `surface` colors with a 80% opacity and a `20px` backdrop-blur to create a "frosted glass" effect for navigation bars or floating action buttons.

---

## 3. Typography

We use a high-contrast pairing of **Plus Jakarta Sans** for editorial impact and **Inter** for functional clarity.

- **Display & Headlines (Plus Jakarta Sans):** These are the "voice" of the app. Use `display-lg` for welcome screens and `headline-md` for module titles. The wide apertures of Jakarta Sans feel friendly and open, mirroring the welcoming nature of the brand.
- **Body & Titles (Inter):** Used for instructional content and metadata. `body-lg` is the standard for lesson descriptions to ensure maximum legibility for users focusing on complex hand signs.
- **Labels (Inter):** `label-md` and `label-sm` should be used sparingly for micro-copy, always in `on-surface-variant` to maintain a soft hierarchy.

---

## 4. Elevation & Depth

Depth in this system is achieved through **Tonal Layering** rather than structural shadows.

- **The Layering Principle:** A card shouldn't need a shadow to be seen. Place a `surface-container-highest` element within a `surface-container-low` area to create natural, soft depth.
- **Ambient Shadows:** When an element must float (e.g., a video playback overlay), use an ultra-diffused shadow.
  - _Formula:_ `0px 20px 40px rgba(48, 41, 80, 0.06)`. This uses the `on-surface` color to create a natural, tinted ambient light effect.
- **The "Ghost Border" Fallback:** For input fields or secondary containers where separation is critical for accessibility, use a "Ghost Border": `outline-variant` (#b0a7d6) at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons

- **Primary:** Full rounded (`9999px`), gradient fill (`primary` to `primary-container`), with `on-primary` text.
- **Secondary:** Surface-tinted. `surface-container-high` background with `primary` text. No border.
- **Tertiary:** Ghost style. No background, `primary` text, bold weight.

### Chips (Learning Tags)

- Use `secondary-container` (#dcc9ff) with `on-secondary-container` (#5b00c7) text.
- Radius: `sm` (0.5rem) to provide a slight visual counterpoint to the rounder buttons.

### Cards & Lesson Modules

- **Radius:** `xl` (3rem) for parent containers; `lg` (2rem) for internal nested elements.
- **Spacing:** Use a minimum of `2rem` (32px) internal padding to ensure the "Professional and Fun" airy feel.
- **No Dividers:** Separate header from body using a `surface-variant` background for the header and `surface-container-lowest` for the body.

### ASL Video Container

- Frame the video feed with a `lg` radius.
- Apply a subtle `Ghost Border` to the video container to separate the motion from the soft background.
- Overlay controls using Glassmorphism (`surface` at 60% with blur).

### Input Fields

- Background: `surface-container-lowest`.
- Radius: `md` (1.5rem).
- Focus State: Transition the `Ghost Border` to 100% opacity `primary`.

---

## 6. Do's and Don'ts

### Do

- **Do** use asymmetrical layouts. For example, a `display-lg` headline aligned left with a learning module offset to the right.
- **Do** leverage the `xl` (3rem) corner radius for main dashboard containers to emphasize the "soft-ui" personality.
- **Do** use `tertiary` (#b80438) specifically for "encouragement" moments (streaks, badges, or celebratory icons).

### Don't

- **Don't** use pure black (#000000) for text. Always use `on-surface` (#302950) to maintain tonal softness.
- **Don't** use standard "drop shadows" with grey values. If it needs a shadow, it must be an **Ambient Shadow** tinted with the brand colors.
- **Don't** use dividers or lines to separate list items. Use vertical white space and subtle background shifts (`surface-container` tiers).
- **Don't** crowd the interface. If a screen feels "busy," increase the whitespace by 20% and remove a container level.
