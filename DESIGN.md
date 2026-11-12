---
name: Movie Passport
description: A mezzotint globe of world cinema; velvet black plate, only what has films burnished to silver.
colors:
  silver-bright: "#f1ede8"
  silver: "#dbd6d1"
  pewter: "#a7a39a"
  plate: "#5a4a3a"
  plate-deep: "#2a2119"
  smoke: "#3c3a37"
  velvet-raised: "#121110"
  velvet: "#0b0b0b"
typography:
  display:
    fontFamily: "Cinzel, Trajan Pro, Georgia, serif"
    fontSize: "44px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0.05em"
  headline:
    fontFamily: "Cinzel, Trajan Pro, Georgia, serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0.08em"
  title:
    fontFamily: "Cinzel, Trajan Pro, Georgia, serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.375
    letterSpacing: "0.06em"
  mark:
    fontFamily: "Cinzel, Trajan Pro, Georgia, serif"
    fontSize: "22px"
    fontWeight: 500
    letterSpacing: "0.34em"
  body:
    fontFamily: "Spectral, Georgia, Times New Roman, serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  body-small:
    fontFamily: "Spectral, Georgia, Times New Roman, serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Cinzel, Trajan Pro, Georgia, serif"
    fontSize: "10px"
    fontWeight: 400
    letterSpacing: "0.22em"
  label-action:
    fontFamily: "Cinzel, Trajan Pro, Georgia, serif"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.22em"
rounded:
  none: "0px"
  print: "1px"
  point: "9999px"
spacing:
  hairline: "1px"
  chip-gap: "8px"
  row: "10px"
  panel-mobile: "20px"
  panel: "24px"
  page-mobile: "24px"
  page: "48px"
  section: "40px"
components:
  button-primary:
    backgroundColor: "{colors.silver}"
    textColor: "{colors.velvet}"
    typography: "{typography.label-action}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.silver}"
    typography: "{typography.label-action}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  button-secondary-hover:
    textColor: "{colors.silver-bright}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.silver}"
    typography: "{typography.label-action}"
    rounded: "{rounded.none}"
    padding: "0 14px"
    height: "40px"
  panel:
    backgroundColor: "{colors.velvet-raised}"
    textColor: "{colors.silver}"
    rounded: "{rounded.none}"
    padding: "{spacing.panel}"
  search-field:
    backgroundColor: "{colors.velvet-raised}"
    textColor: "{colors.silver-bright}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "44px"
  select:
    backgroundColor: "{colors.velvet-raised}"
    textColor: "{colors.silver-bright}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 36px 0 12px"
    height: "40px"
  globe-tooltip:
    backgroundColor: "{colors.velvet-raised}"
    textColor: "{colors.silver-bright}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
  poster-print:
    backgroundColor: "{colors.plate-deep}"
    rounded: "{rounded.print}"
    width: "36px"
---

# Design System: Movie Passport

## Overview

**Creative North Star: "Velvet Night"**

The whole product is a mezzotint plate. A mezzotint begins rocked to an even velvet black, and the image exists only where the engraver burnishes the burr back down so it catches light. Movie Passport works the same way: the page, the ocean and every land without films sit in the rocked black, and only what holds cinema (countries with films, the posters standing on them, the thing under the viewer's attention) is burnished up through pewter to silver. Cinema is light pulled out of a dark room; the interface never adds light that does not mean something.

The material is warm, quiet and printed. Panels are the same black lifted a shade and framed by a single hairline, as if printed onto the plate rather than floating above it. Type is engraved: widely tracked roman capitals for names, captions and labels, a screen roman for anything read at length. Corners are square, there is no glass, no blur and no glow; depth comes from offset shadows falling into the black and from brightness, never from translucency. Density is low: the globe stays large at the centre and every overlay keeps to an edge.

The world refuses the category default of a navy space globe with a glowing atmosphere, neon accents and floating rounded poster cards, and refuses the streaming-service look.

**Key Characteristics:**

- Velvet black ground with a fine warm burr of grain over everything.
- A mezzotint night sky: silver stars and a faint grained Milky Way behind the globe, never blue.
- Silver is the only light; brightness carries meaning (films, selection, attention).
- Warm plate brown marks half-scraped states: hover borders, empty selections, dark land.
- Engraved Cinzel capitals for names, captions and labels; Spectral for reading.
- Square corners, single hairline frames, offset drop shadows, no glass or blur.
- Lucide line icons at a 1.5 stroke; one burnished plate button per view.

## Colors

A near-monochrome warm palette: a black ground, one silver light in three strengths, and a brown half-tone for the plate itself.

### Primary

- **Burnished Silver Bright** (silver-bright): the fully burnished highlight; headings, titles, the current gauge level, focus outlines, the selected country's stroke, the selected poster's frame. The one live thing in a view.
- **Burnished Silver** (silver): primary reading text, chip and secondary-button text, the selected country fill, text selection background, and the plate button's face.

### Secondary

- **Pewter** (pewter): the half-lit; secondary text, captions, engraved labels, inactive borders at reduced opacity, and the fill of countries with films (burnished by count at 34%, 50% and 66% strength).

### Tertiary

- **Half-Scraped Plate** (plate): warm brown for the partly worked plate; the globe's faint atmosphere rim, scrollbar thumbs, and the fill of a selected country that has no films.
- **Dark Plate** (plate-deep): land with no films, and the ground behind posters and portraits while their images load.

### Neutral

- **Rocked Velvet** (velvet): the page, the ocean, the details sheet ground, the knockout ring around poster pins.
- **Raised Velvet** (velvet-raised): panels, search field, dropdowns, tooltips, dialogs; the same black one shade lifted.
- **Smoke** (smoke): hairline frames, rules and dividers.

### Named Rules

**The Silver Means Films Rule.** On the globe, silver is reserved for countries that have films. A selected country with no films is filled with half-scraped plate and outlined in a silver-bright stroke; it is never filled silver.

**The One Light Rule.** There is no accent hue. Emphasis is made by burnishing (velvet, plate, pewter, silver, silver-bright), not by colour. Only film imagery brings colour into the view.

## Typography

**Display Font:** Cinzel (with Trajan Pro, Georgia, serif), weights 400, 500, 600
**Body Font:** Spectral (with Georgia, Times New Roman, serif), roman and italic, weights 400, 500, 600

**Character:** Cinzel reads as letters cut into a plate: inscriptional capitals, always uppercase and widely tracked. Spectral is a quiet screen roman whose italic carries secondary lines (original titles, taglines, roles, hints).

### Hierarchy

- **Display** (400, 32px mobile to 44px, line-height 1.1, tracking 0.05em, uppercase): the film title in the details sheet, with the year in pewter.
- **Headline** (400, 28px mobile to 32px, tracking 0.08em, uppercase): the country name in the country panel.
- **Title** (400, 22px, tracking 0.06em, uppercase): the film title on the film card; error titles at 18px.
- **Mark** (500, 19px mobile to 22px, tracking 0.34em, uppercase): the "Movie Passport" wordmark only.
- **Body** (400, 15px, line-height 1.625): overviews, list titles, dialog text; long overviews cap at 62ch. Stat values step up to 18px with tabular numerals.
- **Body Small** (400, 13px): metadata lines (year, director), credits, roles; often italic, often pewter.
- **Label** (400, 10px, tracking 0.22em, uppercase, pewter): engraved labels for section headings, stats, form labels, gauge levels and dropdown groups. Section headings in the details sheet step up to 11px.
- **Label Action** (500, 11px, tracking 0.22em, uppercase): text inside buttons and chips. The global caption ("Silver countries have films") sets at 12px to 13px.

### Named Rules

**The Engraved Capitals Rule.** Names, captions, labels and actions are set in Cinzel capitals with wide tracking; anything read as a sentence is Spectral. Never set running text in Cinzel, and never set a label in Spectral caps.

**The No Kicker Rule.** No eyebrow or kicker sits above a heading. An engraved label either is the section heading or sits below a name as its caption (continent and plate code under a country).

## Layout

The globe fills the viewport and stays the centre; everything else is an overlay pinned to an edge, and the overlay layer ignores the pointer so the globe stays draggable beneath it. On wide screens: the wordmark and its italic tagline top-left (28px inset), search top-centre (384px wide), the plate gauge on the left edge at mid-height, the country or film panel on the right (24rem wide, 24px from the edge), and an engraved caption centred on the lower margin. Below 640px the panel becomes a bottom sheet (12px insets, capped at 50 to 55% of the viewport height), search drops below the mark, the gauge is hidden, and a velvet band behind the top overlays keeps prints from crossing them.

Panels pad 20px on phones and 24px on wider screens. Lists use roughly 10px vertical rows; chips wrap with an 8px gap; rules separate groups with about 16 to 20px above and below. The details sheet is a page: 24px side margins on phones and 48px on wide screens, sections 40px apart, and from 1024px a two-column grid with a 17rem side column 48px from the main column.

**The Print Spacing Rule.** Posters on the globe keep about one poster height apart on screen when zoomed in, so no print covers another. Zoomed out, only the best-ranked prints show (12 at the global view, 16 closer, never more than 60), and in film view only about 10 prints stay for context.

## Elevation & Depth

Depth is a hybrid of brightness and offset shadow. Surfaces sit on the plate in the same black, a shade raised, with a hairline frame; what separates them is a soft shadow that always falls downward (positive y-offset, negative spread) into the black, never a centred glow. The rest of depth is light: the globe lifts hovered and selected countries off its surface, and posters move from dim to fully burnished as attention arrives.

### Shadow Vocabulary

- **Panel shadow**: under the country and film panels and search dropdown; the deepest on-globe surface.
- **Dialog shadow**: under the About dialog; the details sheet casts the same weight upward from its top edge.
- **Control shadow**: under the search field and the plate button; shallow.
- **Print shadow**: under posters on the globe, in rails and on cards; deepens when a print is selected.

Exact values live in the sidecar.

### Named Rules

**The Offset Shadow Rule.** Every shadow is offset downward and falls into the black. No zero-offset glows, no coloured shadows, no glass, no backdrop blur; modal backdrops are plain black at 75%.

**The Light Follows Attention Rule.** Posters rest at brightness 0.82 and saturation 0.85, and come to full light on hover, keyboard focus, when pointed at from a list, when selected, or when their country is previewed. In film view every print except the selected or attended one sinks to brightness 0.5. On fine pointers a faint 420px silver radial follows the cursor over the plate. New prints surface out of the dark (from brightness 0.2).

**The Night Sky Rule.** The space around the globe is printed in the same mezzotint, never painted as space art: stars are burnished points in silver, warm white and pewter (thicker along the band), and the Milky Way is a mottled haze with dark dust rifts at no more than 30% opacity. It runs as a wandering ring 20 degrees south on the sky, so it passes behind the globe in the opening view however the globe is turned. No blue, no nebula colour, no glow, no twinkle; the sky stays quieter than the land and the posters.

## Shapes

Square corners everywhere: panels, buttons, chips, fields, dialogs, the details sheet and tooltips are all 0px. Posters keep a 1px corner, just enough to read as a trimmed print. The only round forms are burnished points: the poster pin, the gauge dots and the loading disc. Frames are one hairline (1px), in smoke for structure and pewter at 40 to 50% for interactive edges, brightening to silver on hover. Images are always 2:3 prints or 16:9 trailers, each in a hairline frame.

**The Fleuron Rule.** The details sheet header is closed by a fleuron rule: two smoke hairlines meeting a small open diamond (a 6px square, rotated 45 degrees, pewter outline). It is drawn, never typed as a glyph.

## Components

### Buttons

Burnished and few. Text is engraved capitals in Label Action; icons are lucide at 14px, stroke 1.5.

- **Shape:** square (0px), at least 44px tall, 20px side padding, 10px icon gap.
- **Primary (plate button):** a burnished silver face (a vertical gradient from silver-bright towards pewter), velvet text, a silver-bright hairline at 70%, the control shadow. Hover brightens it by 10%; press drops it 1px; disabled fades to 40%.
- **Secondary (hairline button):** transparent, silver text, a pewter hairline at 50%. Hover turns the frame and text silver-bright over a 5% silver wash. "Back to globe" carries an Esc key hint on fine pointers.
- **Text actions:** engraved 10px capitals with a smoke or pewter underline offset 4px ("About & credits", "Dismiss").

**The One Plate Rule.** A view has at most one burnished plate button: "More details" on the film card, "Play trailer" in the details sheet, "Close" in About, "Try again" on an error. Every other action is a hairline button, a chip or a text link.

### Chips

- **Style:** square hairline frame (pewter at 40%), transparent, silver engraved text, 40px tall, 14px side padding.
- **State:** hover brightens frame and text to silver-bright over a 5% silver wash. Used for country links (on the film card, in the empty state's nearby countries, in the details side column).

### Cards / Containers

- **Corner Style:** square (0px).
- **Background:** raised velvet at 95%.
- **Shadow Strategy:** panel shadow (see Elevation & Depth).
- **Border:** one smoke hairline; internal groups are divided by smoke rules.
- **Internal Padding:** 20px on phones, 24px wider. Panels enter by rising 10px and fading in over 360ms.

### Inputs / Fields

- **Search:** a 44px square field in raised velvet with a smoke hairline and control shadow; a 16px lucide search icon in pewter, silver-bright Spectral text, an italic pewter placeholder, and a "/" key hint. Focus within shifts the frame to pewter. Results open below in a raised-velvet dropdown with engraved group labels; the active option takes a 10% silver wash.
- **Select (region):** a 40px square field, pewter hairline at 40%, silver-bright Spectral text, a pewter chevron; hover brightens the frame to silver.

### Navigation

- **Plate gauge:** depth as navigation. A vertical smoke hairline on the left edge carrying four levels (World, Country, Film, Details) as engraved 10px labels with 8px dots. The current level is fully burnished (silver-bright dot and label); levels above are pewter links back out with the country or film name in small italic beneath; levels below stay dark (open dots). Hidden on phones, where the sheet's Back does the job.

### Globe Tooltip and Poster Label

Raised velvet with a smoke hairline and a downward shadow. The tooltip names the country in 14px engraved capitals, the continent in italic pewter and the film count in tabular silver; it is hidden on touch screens. A poster's label appears above it on hover or link, in 10px engraved capitals.

### Poster Print

Each film stands on its country as a small framed print: a 2:3 image in a 1px silver hairline at 35%, a print shadow, on a 5px burnished pin knocked out of the velvet. Its width grows with zoom from 26px to 88px. Hover or link scales it to 1.14 and selection to 1.22, with a silver-bright frame. Prints on the far side or filtered out fade and leave the tab order.

### Film Details Sheet

A page that rises from the bottom over the globe (380ms), 90 to 94% of the viewport tall and up to 64rem wide, square, on rocked velvet with grain, framed by a smoke hairline on three sides. A short pewter grab bar and a square 40px close button sit on top. The header lays the poster beside the display title over the backdrop at 22% in greyscale, then the fleuron rule. Below, the main column carries the trailer, cast and similar films as horizontal rails of 2:3 prints (cast portraits greyscale until hover), and a side column, divided by a smoke hairline from 1024px, carries where to watch, facts, countries and keywords. Section headings are 11px engraved labels.

**The Attribution Rule.** Source credit is part of the design: the TMDB logo and notice in About, a "View on TMDB" link on the film card, JustWatch credited directly under where-to-watch, Natural Earth credited for the map. Credits are set in 13px Spectral pewter with silver underlined links; they are never hidden or removed.

## Do's and Don'ts

### Do:

- **Do** let brightness carry meaning: velvet for nothing, plate for half-worked, pewter for half-lit, silver for films and selection, silver-bright for the one live thing.
- **Do** fill a selected empty country with half-scraped plate and outline it in silver-bright.
- **Do** keep one burnished plate button per view and make every other action a hairline button, chip or link.
- **Do** set names, captions and labels in engraved Cinzel capitals with wide tracking, and reading text in Spectral.
- **Do** rest posters at brightness 0.82 and bring them to full light on hover, link, selection or country preview; dim the rest to 0.5 in film view.
- **Do** keep prints about one poster height apart when zoomed in.
- **Do** use lucide icons at strokeWidth 1.5, sized 14px to 16px.
- **Do** keep TMDB and JustWatch attribution visible wherever their data appears.
- **Do** respect reduced motion: panels, prints and the sheet appear without slides.

### Don't:

- **Don't** fill a country silver unless it has films.
- **Don't** round corners on panels, buttons, chips, fields or dialogs; only pins, gauge dots and the loading disc are round.
- **Don't** use glass, backdrop blur, glow or zero-offset shadows; every shadow is offset downward.
- **Don't** introduce an accent hue, neon, or a navy space-globe atmosphere.
- **Don't** place an eyebrow or kicker above a heading.
- **Don't** use Unicode glyphs as icons or ornaments; use lucide for icons and draw rules and fleurons. The middle dot as a text separator is punctuation, not an icon, and stays.
- **Don't** set running text in Cinzel or in capitals.
