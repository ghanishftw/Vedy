---
name: Vedy Visual System
description: Modern creator-focused dark tool visual guidelines.
colors:
  primary: "#8b5cf6"
  primary-hover: "#7c3aed"
  accent: "#06b6d4"
  accent-hover: "#0891b2"
  neutral-bg: "#09090b"
  neutral-surface: "#18181b"
  neutral-fg: "#f4f4f5"
  neutral-muted: "#a1a1aa"
  border: "#27272a"
typography:
  display:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 4rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-fg}"
    rounded: "{rounded.md}"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design

## Overview
Vedy features a dark, technically premium creator aesthetic ("Modern Dark Tool"). It relies on deep dark backgrounds, subtle glassmorphic panels, and vibrant neon accents (purple and cyan) to anchor interactive control points and timeline tracks.

## Colors
- **Primary Brand Accent (Neon Purple):** `oklch(0.58 0.23 293)` / `#8b5cf6`. Used for primary CTAs and active trimmer tracks.
- **Secondary Accent (Neon Cyan):** `oklch(0.72 0.16 211)` / `#06b6d4`. Used for end handles, tooltips, and secondary info indicators.
- **Base Background:** `oklch(0.18 0.01 262)` / `#09090b`. Deep dark near-black to minimize eye strain.
- **Surfaces/Panels:** `oklch(0.24 0.01 262)` / `#18181b` at `80%` opacity with `12px` backdrop blur.
- **Borders:** `oklch(0.30 0.01 262)` / `#27272a` at `80%` opacity.

## Typography
- **Headings (Display):** Bold, heavy-set sans-serif (`Geist Sans` or system fallback) with tight negative tracking (`-0.02em`) for display properties.
- **Body & Controls:** Balanced utility layout with `14px` (xs/sm controls) and `16px` (main body paragraphs).
- **Prose line length:** Cap text at `70ch` to optimize reading speed.

## Elevation
Visual depth is achieved through translucent borders and color gradients rather than drop shadows:
- **Default Panels:** Thin `1px` translucent border (`border-zinc-800/80`) with `backdrop-blur-md`.
- **Glow Accents:** Soft cyan and purple blurred blobs behind main forms (`blur-[100px]` to `blur-[120px]`) to establish light source anchoring.

## Components
- **Trimmer Slider Track:** Rounded track (`h-3`) in dark zinc (`bg-zinc-800/80`) with active duration highlighted by a cyan/purple gradient track.
- **Interactive Knobs:** Raised white knobs (`w-6 h-6`) featuring border colors representing start (purple) and end (cyan) boundary tags.
- **Action Buttons:** Large rounded-xl bounds with gradient fills and hover scale micro-animations.

## Do's and Don'ts
- **DO** use `text-wrap: balance` on headers to ensure symmetric wrapping.
- **DO** keep active text contrast at a minimum of `4.5:1` against near-black backgrounds.
- **DO** reuse the PointerEvents API for custom interactive touch elements.
- **DON'T** use multi-colored side borders on panels.
- **DON'T** apply CSS gradients on text.
- **DON'T** animate scaling or rotating operations on image hover.
