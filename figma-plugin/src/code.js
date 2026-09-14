// Runs in Figma's sandboxed main thread — no DOM access here.
figma.showUI(__html__, { width: 360, height: 520 });

const DOC_KEY = "exportAssistantMeta";

// Add your team's placeholder conventions here (checked case-insensitively).
const PLACEHOLDER_FLAGS = [
  "lorem ipsum",
  "lorem",
  "placeholder",
  "tbd",
  "dummy text",
  "insert copy",
  "insert text",
];

function isLikelyPlaceholder(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return PLACEHOLDER_FLAGS.some((flag) => lower.includes(flag));
}

function getDocMeta() {
  // Stored on the document node itself, so it travels with the file (not per-user clientStorage).
  const raw = figma.root.getPluginData(DOC_KEY);
  if (!raw) return { fileName: "", version: "", includeDate: true };

  let saved;
  try {
    saved = JSON.parse(raw);
  } catch (error) {
    return { fileName: "", version: "", includeDate: true };
  }
  return {
    fileName: saved.fileName || saved.client || "",
    version: saved.version || saved.round || "",
    includeDate: saved.includeDate !== false,
  };
}

function setDocMeta(meta) {
  figma.root.setPluginData(DOC_KEY, JSON.stringify(meta));
}

function pad(n) {
  return n.toString().padStart(2, "0");
}

function todayStamp() {
  const d = new Date();
  return `${pad(d.getMonth() + 1)}${pad(d.getDate())}${d.getFullYear().toString().slice(-2)}`;
}

function sanitize(part) {
  return String(part || "").trim().replace(/[^a-z0-9]+/gi, "");
}

function buildFilename(meta, frameName) {
  const { fileName, version, includeDate } = meta;
  const parts = [sanitize(fileName), sanitize(frameName)];
  if (includeDate) parts.push(todayStamp());
  parts.push(`v${sanitize(version)}`);
  return `${parts.join("_")}.pdf`;
}

function postSelection() {
  figma.ui.postMessage({
    type: "selection-changed",
    selectionNames: figma.currentPage.selection.map((node) => node.name),
  });
}

function collectDescendants(node, out) {
  out.push(node);
  if ("children" in node) {
    for (const child of node.children) collectDescendants(child, out);
  }
}

// Attempts to load each text node's font(s) — catches fonts missing from the
// local machine, which is more reliable than the static hasMissingFont flag
// when a run has mixed fonts across its characters.
async function hasMissingFont(node) {
  try {
    if (node.fontName !== figma.mixed) {
      await figma.loadFontAsync(node.fontName);
    } else {
      const fonts = node.getRangeAllFontNames(0, node.characters.length);
      for (const font of fonts) {
        await figma.loadFontAsync(font);
      }
    }
    return false;
  } catch (e) {
    return true;
  }
}

async function scanNode(node) {
  const issues = { missingFonts: [], placeholderText: [], hiddenLayers: [] };
  const all = [];
  collectDescendants(node, all);

  for (const n of all) {
    if (n.id !== node.id && n.visible === false) {
      issues.hiddenLayers.push(n.name);
    }
    if (n.type === "TEXT") {
      if (await hasMissingFont(n)) issues.missingFonts.push(n.name);
      if (isLikelyPlaceholder(n.characters)) issues.placeholderText.push(n.name);
    }
  }
  return issues;
}

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case "init": {
      const meta = getDocMeta();
      const selection = figma.currentPage.selection;
      figma.ui.postMessage({
        type: "init",
        meta,
        selectionNames: selection.map((n) => n.name),
      });
      break;
    }

    case "save-meta": {
      setDocMeta(msg.meta);
      figma.ui.postMessage({ type: "meta-saved" });
      break;
    }

    case "scan": {
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.ui.postMessage({ type: "scan-result", error: "Nothing selected." });
        break;
      }
      const results = [];
      for (const node of selection) {
        results.push({ name: node.name, issues: await scanNode(node) });
      }
      figma.ui.postMessage({ type: "scan-result", results });
      break;
    }

    case "export": {
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.ui.postMessage({ type: "export-error", error: "Nothing selected." });
        break;
      }
      const meta = getDocMeta();
      const files = [];
      for (const node of selection) {
        try {
          const bytes = await node.exportAsync({ format: "PDF" });
          files.push({ name: buildFilename(meta, node.name), bytes: Array.from(bytes) });
        } catch (e) {
          figma.ui.postMessage({
            type: "export-error",
            error: `Failed exporting ${node.name}: ${e.message}`,
          });
          return;
        }
      }
      figma.ui.postMessage({ type: "export-result", files, purpose: msg.purpose || "individual" });
      break;
    }

    case "close": {
      figma.closePlugin();
      break;
    }

    default:
      break;
  }
};

figma.on("selectionchange", postSelection);
