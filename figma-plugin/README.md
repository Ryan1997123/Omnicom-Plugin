# Export Assistant (Figma plugin)

Standardizes the client/project/round metadata, runs a pre-export sanity check, and exports correctly-named PDFs for Workfront handoff.

## What it does

1. **Client / Project / Round** — Fill these in once; they're saved on the file itself (`figma.root.setPluginData`), so every teammate who opens the file sees the same values. Bump the round number as you go.
2. **Selection-based** — Works on whatever frame(s) you have selected, no change to how you organize your file.
3. **Pre-export scan** — Flags (non-blocking) missing fonts, leftover "lorem ipsum" text, and hidden layers within the selection.
4. **Filename builder** — Produces `Client_Project_RoundN_FrameName_MMDDYY.pdf` from your saved metadata + today's date.
5. **Export** — Runs Figma's native PDF export per selected frame and downloads it, ready to drag into Workfront.

## Setup

```bash
cd figma-plugin
npm install
npm run build      # one-off build -> dist/code.js, dist/ui.html
npm run watch       # rebuild on save while developing
```

## Load it in Figma

1. Open the Figma desktop app.
2. Menu → **Plugins → Development → Import plugin from manifest…**
3. Select `figma-plugin/manifest.json`.
4. Run it from **Plugins → Development → Export Assistant**.

After `npm run watch`, just re-run the plugin in Figma to pick up changes (no reload needed for UI-only changes; re-import isn't required unless `manifest.json` changes).

## Notes / next steps

- Filenames are sanitized (spaces/punctuation stripped) to avoid Workfront upload issues.
- The QA scan currently checks 3 common issues; add more checks in `src/code.js` (`scanNode`) as your team's checklist grows — e.g. flag frames with no auto-layout, artboard size mismatches, etc.
- Metadata is stored per-file, not per-user, so it's shared with anyone who opens the file.
