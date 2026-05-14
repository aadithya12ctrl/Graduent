# Graduent — UI/UX Design Specification

---

## Design Philosophy

**One sentence:** Premium dev-tool aesthetics, warm not cold, alive not static.

The visual identity sits at the intersection of editorial design and technical tooling — warm cream surfaces, cursor-reactive grainy gradient, glassmorphism used surgically. The product should feel designed, not defaulted.

**Three zones with distinct visual behavior:**
1. **Landing** — cinematic, immersive, full gradient, scrollytelling energy frozen into a single viewport
2. **Main App Shell** — gradient persists but quieter, glass panels, focused information density
3. **Exercise View** — gradient nearly imperceptible, maximum reading clarity, zero distraction

---

## Color System

```
Background base     #F8F5F0    warm off-white / cream
Gradient warm       #FBBF8C    soft peach-orange
Gradient cool       #C4D9F0    pale lavender-blue
Gradient mid        #F4A7A7    blush-rose
Grain texture       SVG noise  ~8% opacity over gradient layer
Glass panels        rgba(255,255,255,0.62)  + blur(18px)
Glass border        rgba(255,255,255,0.45)  1px
Text primary        #1A1814    near-black, never #000
Text secondary      #6B6862
Text tertiary       #A8A49E
Accent — core logic #7C3AED    deep violet (blanks, semantic tags)
Accent — success    #059669    correct answers, complete nodes
Accent — error      #DC2626    wrong answers, error indicators
Accent — warning    #D97706    state-assumption errors
Code highlight      #7C3AED at 12% opacity (bg wash for core logic lines)
```

### Semantic Tag Colors
```
[scaffold]    #A8A49E bg + #6B6862 text
[core logic]  #EDE9FE bg + #7C3AED text   ← accent color
[output]      #D1FAE5 bg + #059669 text
```

---

## Typography

```
Display font    Berkeley Mono   (headings, product name, exercise numbers)
Body font       Geist Sans      (UI labels, descriptions, prose)
Code font       Berkeley Mono   (all code, output rail annotations)

Sizes
  Product name (landing)    72px / 700 / Berkeley Mono / tracking -2px
  Section headings          18px / 500 / Geist Sans
  Body                      15px / 400 / Geist Sans / line-height 1.6
  Code                      13px / 400 / Berkeley Mono / line-height 1.7
  Labels / captions         12px / 500 / Geist Sans / tracking 0.04em / uppercase
  Error type badges         11px / 600 / Geist Sans / tracking 0.06em
```

---

## Gradient System (Live, Cursor-Reactive)

This is the defining visual — it must feel alive.

### Implementation Logic

```css
/* Three radial gradient orbs positioned relative to viewport */
/* Orb 1: follows cursor at 30% speed (warm peach) */
/* Orb 2: counter-follows at 15% speed (cool lavender) */
/* Orb 3: fixed anchor, slowly drifts (blush rose) */

--orb1: radial-gradient(ellipse 700px 500px at var(--cx1) var(--cy1),
          rgba(251,191,140,0.75) 0%, transparent 70%)
--orb2: radial-gradient(ellipse 600px 600px at var(--cx2) var(--cy2),
          rgba(196,217,240,0.65) 0%, transparent 65%)
--orb3: radial-gradient(ellipse 500px 700px at 60% 70%,
          rgba(244,167,167,0.55) 0%, transparent 60%)

background: var(--orb1), var(--orb2), var(--orb3), #F8F5F0
```

```js
// Cursor tracking — smooth interpolation
let tx1 = 50, ty1 = 50  // target position for orb1
let cx1 = 50, cy1 = 50  // current interpolated position

document.addEventListener('mousemove', e => {
  tx1 = (e.clientX / window.innerWidth) * 100
  ty1 = (e.clientY / window.innerHeight) * 100
})

function animate() {
  // Orb 1: follows cursor, 8% lerp per frame = responsive but smooth
  cx1 += (tx1 - cx1) * 0.08
  cy1 += (ty1 - cy1) * 0.08
  // Orb 2: inverse follow, creates tension
  cx2 += (100 - tx1 - cx2) * 0.04
  cy2 += (100 - ty1 - cy2) * 0.04

  root.style.setProperty('--cx1', cx1 + '%')
  root.style.setProperty('--cy1', cy1 + '%')
  root.style.setProperty('--cx2', cx2 + '%')
  root.style.setProperty('--cy2', cy2 + '%')
  requestAnimationFrame(animate)
}
```

### Grain Texture Layer

```css
/* SVG noise filter applied as pseudo-element over gradient */
.grain::after {
  content: '';
  position: fixed;
  inset: 0;
  opacity: 0.08;
  background-image: url("data:image/svg+xml,..."); /* turbulence filter */
  pointer-events: none;
  z-index: 0;
}

/* SVG filter for grain */
<filter id="grain">
  <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3"
    stitchTiles="stitch"/>
  <feColorMatrix type="saturate" values="0"/>
</filter>
```

**Grain intensity by zone:**
- Landing: 0.08 opacity (full grain)
- Main app with sidebar: 0.06 opacity
- Exercise view: 0.04 opacity (barely perceptible)

---

## Glass Panel System

Used for: sidebar, floating toolbars, modals, output rail, feedback overlay.

```css
.glass {
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.6) inset,  /* top highlight */
    0 4px 24px rgba(26,24,20,0.06);
}

.glass-heavy {
  /* Modals, feedback overlays */
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(28px) saturate(180%);
}

.glass-light {
  /* Output rail, secondary panels */
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(12px);
}
```

**Border radius by context:**
```
Card panels       16px
Floating toolbars 12px
Inline chips/pills 6px
Code tab bar      10px top only
Input fields      8px
Buttons           8px
```

---

## Spacing System

```
Base unit: 4px

4px   — icon-label gap, inline spacing
8px   — component padding tight
12px  — between related elements
16px  — standard component padding
20px  — section breathing room
24px  — panel padding
32px  — between sections
48px  — major layout gaps
```

---

## Screen 1: Landing Page

### Layout

Full viewport, no scroll. Everything visible above the fold on a 1440px screen.

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│          [gradient + grain, full bleed, live]           │
│                                                         │
│                                                         │
│              GRADUENT                                   │
│    learn to understand code. not recognize it.          │
│                                                         │
│         [ ML/AI ]  [ DSA ]  [ LLMs ]                   │
│                                                         │
│    [ _________________________ ]  ← theme input         │
│     e.g. pokémon, formula 1, marvel                     │
│                                                         │
│                   [ Start → ]                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Component Specs

**Product name:**
- Font: Berkeley Mono, 72px, weight 700
- Color: #1A1814
- Letter spacing: -2px
- Position: horizontally centered, vertically at 38% of viewport height
- No animation on load — it should just be there, confident

**Tagline:**
- Font: Geist Sans, 16px, weight 400
- Color: #6B6862
- 12px below product name
- Letter spacing: 0.02em

**Stream selector pills:**
- 32px height, 12px horizontal padding
- Unselected: glass background, #6B6862 text, 1px border rgba(26,24,20,0.12)
- Selected: rgba(26,24,20,0.88) background, #F8F5F0 text, no border
- Hover: rgba(26,24,20,0.06) background tint
- Transition: 150ms ease all
- Gap between pills: 8px

**Theme input:**
- 280px wide, 44px height
- Glass style (.glass), 8px border-radius
- Font: Geist Sans 15px, color #1A1814
- Placeholder: Geist Sans 15px, color #A8A49E
- Focus: border 1px solid rgba(124,58,237,0.4) + subtle violet glow (box-shadow 0 0 0 3px rgba(124,58,237,0.08))
- No label — placeholder carries the instruction

**Start button:**
- 120px wide, 44px height
- Disabled state: background rgba(26,24,20,0.08), text #A8A49E, cursor not-allowed
- Enabled state: background #1A1814, text #F8F5F0, cursor pointer
- Hover enabled: background #2C2A26, transform translateY(-1px), shadow 0 4px 12px rgba(26,24,20,0.2)
- Active: transform translateY(0)
- Transition: 200ms ease all
- → arrow: 16px Berkeley Mono, inline with text, 6px gap

**Gradient behavior on landing:**
- Orb 1 starts at 30% 40% (warm peach, top-left area)
- Orb 2 starts at 70% 60% (cool lavender, bottom-right)
- Orb 3 fixed at 55% 75% (blush rose, bottom-center)
- Full cursor reactivity, 8% lerp

---

## Screen 2: Main App Shell

### Layout

```
┌──────────────┬──────────────────────────────────────────┐
│              │                                          │
│   SIDEBAR    │         MAIN CONTENT AREA                │
│   280px      │         fluid                            │
│   glass      │         gradient background              │
│              │                                          │
│  [nav tabs]  │                                          │
│              │                                          │
│  [panel      │                                          │
│   content]   │                                          │
│              │                                          │
│              │                                          │
│  [session    │                                          │
│   info]      │                                          │
└──────────────┴──────────────────────────────────────────┘
```

**Sidebar:**
- Width: 280px, fixed left
- Background: glass heavy — rgba(255,255,255,0.72), blur(20px)
- Right border: 1px solid rgba(255,255,255,0.4)
- Box shadow: 4px 0 32px rgba(26,24,20,0.04) rightward
- Content sits on the glass, z-index above gradient

**Sidebar tabs (top navigation):**
```
[ Roadmap ]  [ Error Log ]  [ Weights ]  [ Pipeline ]
```
- 12px font, uppercase, tracking 0.06em, Geist Sans
- Active tab: #1A1814 text, 2px bottom border #7C3AED
- Inactive: #A8A49E, no border
- Tab strip: 48px height, border-bottom 1px solid rgba(26,24,20,0.06)
- Scrollable content below tab strip

**Session info strip (sidebar bottom):**
- Stream badge + theme name
- 14px Geist Sans, color #6B6862
- Pinned to bottom, above 16px padding
- Separator line: 1px solid rgba(26,24,20,0.06)

**Main content area:**
- Gradient + grain persists as background (0.06 grain)
- Content panels float on top as glass cards
- Padding: 24px

---

## Sidebar Panel: Roadmap

Node graph showing clusters and nodes within them.

### Visual Language

**Cluster container:**
- Label: 11px uppercase, tracking 0.06em, #A8A49E
- Cluster nodes arranged vertically with 8px gap

**Node states:**
```
locked      — circular indicator, rgba(168,164,158,0.2) fill, #A8A49E border + text
in_progress — violet fill rgba(124,58,237,0.12), #7C3AED border (1.5px) + text
complete    — #059669 fill rgba(5,150,105,0.12), #059669 border + text, checkmark icon
```

**Node item:**
- 40px height, 12px horizontal padding
- 12px border-radius
- Left: 8px colored dot (state color) + node name (13px Geist Sans)
- Right: attempt count in #A8A49E if > 0
- Connector line between nodes: 1px dashed, rgba(168,164,158,0.4), 8px left margin

**Pipeline stitch unlock indicator:**
- Appears below every 3-node cluster group
- "⚡ Stitch available" in #D97706, 11px, italic
- Only visible when all 3 nodes are complete

---

## Sidebar Panel: Error Log

Table showing every mistake.

### Layout

```
RECENT ERRORS                            [clear]

┌─────────────────────────────────────────────┐
│ logic    tokenization   wrong_variable  2m  │  ← row
├─────────────────────────────────────────────┤
│ typo     rnn_forward    off_by_one      5m  │
└─────────────────────────────────────────────┘
```

**Error row:**
- 44px height, 12px padding
- Expandable: click → row expands to show "wrote: X / expected: Y / why: ..."
- Error type badge: pill chip, 10px font, 500 weight
  - logic: amber bg + text
  - syntax: violet bg + text
  - typo: blue-gray bg + text
  - scope: coral bg + text
  - state: rose bg + text
- Topic: 13px Geist Sans #6B6862
- Subtype: 12px #A8A49E
- Time: 12px #A8A49E, right-aligned
- Expanded state: rgba(26,24,20,0.02) bg, border-left 2px solid (error type color)
- Divider between rows: 1px solid rgba(26,24,20,0.05)

---

## Sidebar Panel: Error Weights (Radar Chart)

Visual fingerprint of the student's error profile.

### Radar Chart Specs

- Pentagon shape, 5 axes: syntax / logic / typo / scope / state
- Chart size: 200px × 200px, centered in panel
- Background rings: 3 concentric pentagons, rgba(168,164,158,0.12) stroke
- Axis lines: 0.5px, rgba(168,164,158,0.3)
- Axis labels: 11px Geist Sans, uppercase, #A8A49E
- Filled polygon: rgba(124,58,237,0.18) fill, #7C3AED stroke 1.5px
- Data point dots: 4px radius, #7C3AED fill, white 1px border
- Dominant error axis: label turns #1A1814 weight 600

**Update animation:**
- On new error: polygon morphs with 400ms ease cubic-bezier(0.34,1.56,0.64,1) — slight overshoot spring
- Dot on updating axis: pulses (scale 1 → 1.5 → 1) over 300ms

**Below chart:**
```
Dominant error: LOGIC                    ← 12px, uppercase, #1A1814
Last updated: 2 min ago                  ← 11px, #A8A49E
```

---

## Sidebar Panel: Pipeline

Shows pipeline stitching state for the current cluster.

**Block list:**
```
✓  Tokenization        [complete]
✓  Vocabulary Build    [complete]
✗  Padding & Tensors   [in progress]
   ────── stitch ──────  [locked]
```

**Stitch section (unlocked):**
- Visible once all 3 blocks complete
- Shows glue code blank: monospace input with violet underline, 13px Berkeley Mono
- Submit button: 28px height, small, violet
- On wrong: inline error feedback (same pattern as exercise feedback)

---

## Screen 3: Exercise View

The most complex screen. Must be focused, zero visual noise.

### Tab Bar (MacBook-style)

```
┌──────────────────────────────────────────────────────┐
│  ● ● ●   [ Code ]  [ Output Rail ]  [ Theory ]  [ Alt Way ]  │
└──────────────────────────────────────────────────────┘
```

**Tab bar specs:**
- Glass panel: full width, 48px height
- Left: 3 traffic light dots (decorative, 8px circles: #FC5F57 / #FDBC2C / #34C749) — 16px from left edge
- Tab pills: 12px font, 500 weight, Geist Sans
- Active: rgba(124,58,237,0.1) bg, #7C3AED text, 6px border-radius
- Inactive: transparent bg, #A8A49E text
- Active tab pill has subtle left-right padding: 12px × 6px
- No underline — pill bg is the indicator
- Gap between tabs: 4px

### Tab: Code

Main exercise interface. Split view: code editor left + output rail right.

```
┌──────────────────────────────┬──────────────────┐
│  PROBLEM STATEMENT           │   OUTPUT RAIL    │
│  13px italic Geist, #6B6862  │                  │
│                              │  line 3 →        │
│  semantic tag bar            │  type: List[int] │
│  [scaffold] [core logic]     │  shape: (128,)   │
│  [output]                    │  ──────────────  │
│                              │  [ Predict ]     │
│  code block                  │                  │
│  with blanks                 │  [ ? ] [ ? ]     │
│                              │  [ ? ] [ ? ]     │
│  line 1  def tokenize(...)   │                  │
│  line 2    tokens = ___      │                  │
│  line 3    encoded = ___     │                  │
│                              │                  │
│  [ Submit ]                  │                  │
└──────────────────────────────┴──────────────────┘
```

**Problem statement:**
- 13px Geist Sans, italic, #6B6862
- 16px bottom margin
- Max 3 lines — truncated with "..." if longer

**Semantic tag strip:**
- Sits between problem statement and code
- Horizontal row of pill chips: [scaffold] [core logic] [output]
- Each 24px height, 8px horizontal padding, 6px border-radius
- Colors from semantic tag color system above
- 8px gap between pills

**Code area:**
- Background: rgba(255,255,255,0.55), blur(12px) — lighter glass
- 16px padding, 12px border-radius
- Line numbers: 12px Berkeley Mono, #A8A49E, right-aligned, 32px column
- Code text: 13px Berkeley Mono, #1A1814
- Core logic lines: left border 2px solid #7C3AED, bg rgba(124,58,237,0.04)
- Scaffold lines: #A8A49E text (slightly muted)

**Blanks:**
- Inline within code line — an input field, font-matched (13px Berkeley Mono)
- Width: auto-expands to content, min 80px
- Style: no visible box — only a violet underline (border-bottom 2px solid #7C3AED)
- On focus: soft glow (box-shadow 0 2px 0 rgba(124,58,237,0.25))
- On correct submit: underline transitions to #059669, text turns #059669
- On wrong submit: underline flashes #DC2626 × 2, then returns to violet

**Submit button:**
- Full width of code area, 40px height
- 12px bottom margin from last code line
- Style: #1A1814 bg, #F8F5F0 text when blanks filled; muted/disabled when empty
- Geist Sans 14px 500

**Output rail:**
- 220px fixed right panel
- Glass light: rgba(255,255,255,0.45), blur(12px)
- Border-left: 1px solid rgba(255,255,255,0.4)

**Output annotation per line:**
```
line 3                     ← 11px, uppercase, #A8A49E
tokens                     ← 13px Berkeley Mono, #1A1814
type: List[str]            ← 12px Berkeley Mono, #6B6862
shape: (128,)              ← 12px Berkeley Mono, #6B6862
──────────────────
```
- Separator: 1px dashed rgba(168,164,158,0.3)
- 12px padding between annotations

**Prediction UI (before annotation revealed):**
- Replaces annotation with: "What does this contain?"
- 4 option pills in 2×2 grid
- Each pill: 28px height, 12px font Berkeley Mono, glass style
- Hover: rgba(124,58,237,0.08) bg
- On select:
  - Correct: pill turns #059669 bg, white text, annotation revealed with slide-down 200ms
  - Wrong: pill flashes red, correct pill highlights green, annotation revealed

---

### Tab: Theory

Layered callouts alongside the same code. Three depth layers.

**Layout:**
- Code on left (same as Code tab, no blanks — they're already submitted or read-only)
- Theory column on right, 240px

**Theory layers — toggle control:**
```
[ L1 ]  [ L2 ]  [ L3 ]    ← 3 pill toggles, stacked depth
```
- L1: What it does (surface)
- L2: Why it works (conceptual)
- L3: Mathematical / technical detail

**Callout card:**
- 12px border-radius, glass
- Left accent border 3px solid (L1=#059669, L2=#D97706, L3=#7C3AED)
- Leader line (1px dashed) connecting callout to code line
- Title: 12px uppercase Geist Sans
- Body: 13px Geist Sans, line-height 1.6
- Callouts animate in on layer toggle: 150ms fade + 6px slide up

---

### Tab: Alt Way

Presents the same concept in an alternate code form (different representation / library).

**Header bar:**
```
ALTERNATE REPRESENTATION
NumPy  →  PyTorch
```
- 12px uppercase label, #A8A49E
- Representation badges: pill chips

**Content:** Same blank interface as Code tab. Same interaction patterns. Different code framing.

---

## Feedback Overlay

Triggered after wrong submission. Appears above exercise, not full-screen takeover.

```
┌─────────────────────────────────────────────────────┐
│  ✗  logic error  ·  wrong_variable                  │
│                                                      │
│  You wrote:      model.train(test_loader)            │  ← red
│  Expected:       model.train(train_loader)           │  ← green
│                                                      │
│  Why:  The DataLoader passed to the training loop    │
│        must be the training split. test_loader       │
│        contains validation data and would cause      │
│        the model to learn from evaluation samples.   │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │  Quick check: What object does DataLoader   │    │
│  │  return when iterated?  [ _______ ]  →      │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│              [ Got it, try again ]                   │
└─────────────────────────────────────────────────────┘
```

**Overlay specs:**
- glass-heavy: rgba(255,255,255,0.88), blur(28px)
- 24px padding, 16px border-radius
- Appears with: fade-in 200ms + translateY(8px → 0) slide
- Box shadow: 0 8px 48px rgba(26,24,20,0.12)
- Border: 1px solid rgba(255,255,255,0.5)
- Does NOT cover tab bar — appears inside exercise content area
- Width: matches code area width

**Error header:**
- Error type badge (using error log badge style) + subtype
- Red ✗ icon, 16px

**Code diff rows:**
- 13px Berkeley Mono
- "You wrote" row: rgba(220,38,38,0.08) bg, #DC2626 text
- "Expected" row: rgba(5,150,105,0.08) bg, #059669 text
- 8px padding each row, 4px border-radius

**Why section:**
- 13px Geist Sans, #1A1814, line-height 1.7

**Quick check:**
- Inline glass card, same blank interaction as main exercise

**CTA button:**
- Full width, 44px, #1A1814 bg, #F8F5F0 text, 8px radius

---

## Spaced Repetition Queue

Surfaces as a glass card in main content area (not inside sidebar) when blocks are due.

```
┌────────────────────────────────────────────────┐
│  ⏱  REVIEW DUE  ·  3 blocks                    │
│                                                 │
│  dijkstra_relaxation_step    due now            │
│  attention_score_computation  due now           │
│  rnn_forward_pass            due in 4h          │
│                                                 │
│           [ Start review session ]              │
└────────────────────────────────────────────────┘
```

- Glass panel, 16px border-radius
- Left border: 3px solid #D97706 (warning amber)
- Block list: 40px per row, 13px Berkeley Mono block name, 12px Geist time
- Button: violet accent (#7C3AED bg, white text)

Micro-exercise view: identical to Code tab but with single blank only, no output rail.

---

## Interaction Patterns

### Empty / Disabled States
- Disabled inputs: 40% opacity, cursor not-allowed
- Empty states in panels: 13px Geist italic, #A8A49E, centered with 32px top margin

### Transitions
```
Default UI transitions    150ms ease
Panel open/close          200ms cubic-bezier(0.4, 0, 0.2, 1)
Feedback overlay          200ms ease + translateY
Radar chart morph         400ms cubic-bezier(0.34, 1.56, 0.64, 1)
Correct answer reveal     300ms ease (underline color + fade green)
Gradient cursor follow    rAF with 8% lerp (no CSS transition)
```

### Focus States
All interactive elements: `outline: none; box-shadow: 0 0 0 3px rgba(124,58,237,0.15)` on focus-visible.

### Scrollbars (sidebar panels)
```css
::-webkit-scrollbar { width: 4px }
::-webkit-scrollbar-track { background: transparent }
::-webkit-scrollbar-thumb { background: rgba(168,164,158,0.4); border-radius: 2px }
```

---

## Z-Index Stack

```
Gradient + grain      z-0
Glass panels          z-10
Tab content           z-20
Feedback overlay      z-30
Tooltip / dropdown    z-40
```

---

## Responsive Notes

Desktop only (1280px+ minimum). No mobile layout. Sidebar collapses to icon rail at < 1280px if needed but is not a priority for hackathon MVP.

---

## Do Not

- No dark background default — this product stands out by being light
- No blue as accent — too generic for dev tools
- No pure white (#FFF) surfaces — always cream-tinted or glass
- No gradient in text (the gradient is a background element only)
- No grain on interactive elements — grain is background layer only
- No blur on code text — output rail glass must not blur code content
- No multiple simultaneous feedback overlays
- Never pure black (#000) anywhere

---

*Graduent UI/UX Spec v1.0 — designed to feel alive, not loud.*
