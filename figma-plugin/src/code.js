// Runs in Figma's sandboxed main thread — no DOM access here.
figma.showUI(__html__, { width: 360, height: 520 });

const DOC_KEY = "exportAssistantMeta";

function getDocMeta() {
  // Stored on the document node itself, so it travels with the file (not per-user clientStorage).
  const raw = figma.root.getPluginData(DOC_KEY);
  return raw ? JSON.parse(raw) : { client: "", project: "", round: "" };
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
  const { client, project, round } = meta;
  return `${sanitize(client)}_${sanitize(project)}_Round${sanitize(round)}_${sanitize(
    frameName
  )}_${todayStamp()}.pdf`;
}

function collectDescendants(node, out) {
  out.push(node);
  if ("children" in node) {
    for (const child of node.children) collectDescendants(child, out);
  }
}

function scanNode(node) {
  const issues = { missingFonts: [], placeholderText: [], hiddenLayers: [] };
  const all = [];
  collectDescendants(node, all);

  for (const n of all) {
    if (n.id !== node.id && n.visible === false) {
      issues.hiddenLayers.push(n.name);
    }
    if (n.type === "TEXT") {
      if (n.hasMissingFont) issues.missingFonts.push(n.name);
      const text = n.characters || "";
      if (/lorem ipsum|placeholder text/i.test(text)) {
        issues.placeholderText.push(n.name);
      }
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
      const results = selection.map((node) => ({
        name: node.name,
        issues: scanNode(node),
      }));
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
      figma.ui.postMessage({ type: "export-result", files });
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
