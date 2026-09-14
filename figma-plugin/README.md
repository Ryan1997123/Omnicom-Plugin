# Export Assistant (Figma plugin)

Standardizes the file name/version metadata, runs a pre-export sanity check, and exports correctly-named PDFs for Workfront handoff.

## What it does

1. **File name / Version** — Fill these in once; they're saved on the file itself (`figma.root.setPluginData`), so every teammate who opens the file sees the same values. Bump the version number as you go.
2. **Selection-based** — Works on whatever frame(s) you have selected, no change to how you organize your file.
3. **Pre-export scan** — Flags (non-blocking) missing fonts, leftover "lorem ipsum" text, and hidden layers within the selection.
4. **Filename builder** — Produces `FileName_FrameName_MMDDYY_vN.pdf` from your saved metadata + today's date.
5. **Export** — Runs Figma's native PDF export per selected frame and downloads it, ready to drag into Workfront.

## Setup

```bash
cd figma-plugin
npm install
npm run build      # one-off build -> dist/code.js, dist/ui.html
npm run watch       # rebuild on save while developing
```

## Styling with Tailwind

Tailwind is installed and runs through the existing webpack/PostCSS build. The Coolors palette is available as utility classes such as `bg-thistle-900`, `text-pastel-petal-500`, and `border-icy-blue-300`. Satoshi is available as `font-satoshi`.

The same colors are also exposed as CSS variables in `src/styles.css`, for example `var(--color-thistle-900)`. Update `tailwind.config.js` when adding or renaming design tokens.

## Load it in Figma

1. Open the Figma desktop app.
2. Menu → **Plugins → Development → Import plugin from manifest…**
3. Select `figma-plugin/manifest.json`.
4. Run it from **Plugins → Development → Export Assistant**.

After `npm run watch`, just re-run the plugin in Figma to pick up changes (no reload needed for UI-only changes; re-import isn't required unless `manifest.json` changes).

## Notes / next steps

- Filenames are sanitized (spaces/punctuation stripped) to avoid Workfront upload issues.
- Placeholder detection uses the `PLACEHOLDER_FLAGS` list in `src/code.js` (currently: lorem ipsum, tbd, dummy text, insert copy/text, etc.) — add your team's own conventions there (e.g. "XX", "CLIENT NAME HERE").
- Missing-font detection actually attempts `figma.loadFontAsync` on each text run (handles mixed-font text runs), rather than relying only on the static `hasMissingFont` flag.
- The QA scan currently checks 3 common issues; add more checks in `src/code.js` (`scanNode`) as your team's checklist grows — e.g. flag frames with no auto-layout, artboard size mismatches, etc.
- Metadata is stored per-file (`figma.root.setPluginData`), not per-user `clientStorage`, so it's shared with anyone who opens the file.
- Multiple selected frames export as separate PDFs (each suffixed with its frame name), not combined into one multi-page PDF. Combining would require bundling a PDF library (e.g. `pdf-lib`) into the UI bundle.
