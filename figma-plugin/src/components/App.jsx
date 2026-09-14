import React, { useEffect, useState, useCallback } from "react";

function postToPlugin(message) {
  parent.postMessage({ pluginMessage: message }, "*");
}

function downloadFile(name, byteArray) {
  const blob = new Blob([new Uint8Array(byteArray)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function IssueList({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="issue-group">
      <strong>{title}</strong>
      <ul>
        {items.map((name, i) => (
          <li key={i}>{name}</li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  const isPreview = new URLSearchParams(window.location.search).has("preview");
  const [meta, setMeta] = useState(
    isPreview
      ? { fileName: "AcmeCoHomepage", project: "HomepageRedesign", version: "3" }
      : { fileName: "", project: "", version: "" }
  );
  const [selectionNames, setSelectionNames] = useState(
    isPreview ? ["Homepage", "Checkout"] : []
  );
  const [scanResults, setScanResults] = useState(
    isPreview
      ? [
          {
            name: "Homepage",
            issues: { missingFonts: [], placeholderText: [], hiddenLayers: [] },
          },
          {
            name: "Checkout",
            issues: {
              missingFonts: [],
              placeholderText: ["CTA copy"],
              hiddenLayers: ["WIP notes"],
            },
          },
        ]
      : null
  );
  const [scanError, setScanError] = useState("");
  const [exportError, setExportError] = useState("");
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isPreview) return undefined;
    postToPlugin({ type: "init" });

    const handler = (event) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;

      if (msg.type === "init") {
        setMeta(msg.meta);
        setSelectionNames(msg.selectionNames);
      }
      if (msg.type === "meta-saved") {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
      if (msg.type === "scan-result") {
        setScanError(msg.error || "");
        setScanResults(msg.error ? null : msg.results);
      }
      if (msg.type === "export-result") {
        setExporting(false);
        msg.files.forEach((f) => downloadFile(f.name, f.bytes));
      }
      if (msg.type === "export-error") {
        setExporting(false);
        setExportError(msg.error);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleSaveMeta = useCallback(
    (e) => {
      e.preventDefault();
      postToPlugin({ type: "save-meta", meta });
    },
    [meta]
  );

  const handleScan = useCallback(() => {
    setScanError("");
    setScanResults(null);
    postToPlugin({ type: "scan" });
  }, []);

  const handleExport = useCallback(() => {
    setExportError("");
    setExporting(true);
    postToPlugin({ type: "export" });
  }, []);

  const metaComplete = meta.fileName && meta.project && meta.version;

  return (
    <div className="app">
      <h2>Export Assistant</h2>

      <form onSubmit={handleSaveMeta} className="meta-form">
        <label>
          File name
          <input
            value={meta.fileName}
            onChange={(e) => setMeta({ ...meta, fileName: e.target.value })}
            placeholder="AcmeCoHomepage"
          />
        </label>
        <label>
          Project
          <input
            value={meta.project}
            onChange={(e) => setMeta({ ...meta, project: e.target.value })}
            placeholder="HomepageRedesign"
          />
        </label>
        <label>
          Version
          <input
            value={meta.version}
            onChange={(e) => setMeta({ ...meta, version: e.target.value.replace(/^v/i, "") })}
            placeholder="3"
          />
        </label>
        <button type="submit">Save to file</button>
        {saved && <span className="saved-badge">Saved ✓</span>}
      </form>

      <div className="section">
        <h3>Selection</h3>
        {selectionNames.length === 0 ? (
          <p className="muted">Select the frame(s) you want to export.</p>
        ) : (
          <ul>
            {selectionNames.map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="section">
        <h3>Pre-export check</h3>
        <button onClick={handleScan} disabled={selectionNames.length === 0}>
          Scan selection
        </button>
        {scanError && <p className="error">{scanError}</p>}
        {scanResults && (
          <div className="scan-results">
            {scanResults.map((r, i) => {
              const { missingFonts, placeholderText, hiddenLayers } = r.issues;
              const clean =
                missingFonts.length === 0 &&
                placeholderText.length === 0 &&
                hiddenLayers.length === 0;
              return (
                <div key={i} className="scan-frame">
                  <strong>{r.name}</strong>
                  {clean ? (
                    <p className="ok">No issues found ✓</p>
                  ) : (
                    <>
                      <IssueList title="Missing fonts" items={missingFonts} />
                      <IssueList title="Placeholder text" items={placeholderText} />
                      <IssueList title="Hidden layers" items={hiddenLayers} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="section">
        <button
          className="primary"
          onClick={handleExport}
          disabled={!metaComplete || selectionNames.length === 0 || exporting}
        >
          {exporting ? "Exporting…" : "Export as PDF"}
        </button>
        {!metaComplete && <p className="muted">Fill in file name/project/version first.</p>}
        {exportError && <p className="error">{exportError}</p>}
      </div>
    </div>
  );
}
