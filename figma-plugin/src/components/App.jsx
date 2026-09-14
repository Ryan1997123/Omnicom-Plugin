import React, { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  FileCheck2,
  FileText,
  Layers3,
  ScanSearch,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

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
  const filenamePreview = metaComplete
    ? `${meta.fileName}_${meta.project}_Frame_MMDDYY_v${meta.version}.pdf`
    : "FileName_Project_Frame_MMDDYY_v#.pdf";

  return (
    <div className="app advanced-app">
      <header className="advanced-header">
        <div>
          <p className="advanced-eyebrow"><Sparkles size={11} /> OWDIA / DELIVERY TOOL</p>
          <h1>Export Assistant</h1>
          <p>Review once. Ship with confidence.</p>
        </div>
        <span className={selectionNames.length ? "advanced-status is-ready" : "advanced-status"}>
          {selectionNames.length ? "Ready" : "Waiting"}
        </span>
      </header>

      <form onSubmit={handleSaveMeta} className="advanced-panel advanced-form">
        <div className="advanced-section-heading">
          <span className="advanced-icon"><FileText size={15} /></span>
          <div><h2>Export details</h2><p>Saved to this Figma file.</p></div>
          {saved && <span className="advanced-saved">Saved</span>}
        </div>
        <label>
          File name
          <input
            value={meta.fileName}
            onChange={(e) => setMeta({ ...meta, fileName: e.target.value })}
            placeholder="AcmeCoHomepage"
          />
        </label>
        <div className="advanced-field-row">
          <label>
            Project
            <input value={meta.project} onChange={(e) => setMeta({ ...meta, project: e.target.value })} placeholder="HomepageRedesign" />
          </label>
          <label className="advanced-version-field">
            Version
            <input value={meta.version} onChange={(e) => setMeta({ ...meta, version: e.target.value.replace(/^v/i, "") })} placeholder="3" />
          </label>
        </div>
        <button className="advanced-secondary" type="submit">Save details</button>
      </form>

      <section className="advanced-panel advanced-section">
        <div className="advanced-section-heading">
          <span className="advanced-icon"><Layers3 size={15} /></span>
          <div><h2>Selected frames</h2><p>{selectionNames.length ? "Frames queued for export." : "Choose frames in Figma to begin."}</p></div>
          <span className="advanced-count">{selectionNames.length}</span>
        </div>
        {selectionNames.length === 0 ? (
          <p className="advanced-empty">No frames selected</p>
        ) : (
          <ul className="advanced-selection-list">
            {selectionNames.map((name, i) => (
              <li key={i}><span>{name}</span><span>Selected</span></li>
            ))}
          </ul>
        )}
      </section>

      <section className="advanced-panel advanced-section">
        <div className="advanced-section-heading">
          <span className="advanced-icon"><ScanSearch size={15} /></span>
          <div><h2>Pre-export check</h2><p>Fonts, copy, and hidden layers.</p></div>
          {scanResults && <span className="advanced-saved">Checked</span>}
        </div>
        <button className="advanced-secondary" onClick={handleScan} disabled={selectionNames.length === 0}>
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
                <div key={i} className={clean ? "advanced-scan-frame is-clean" : "advanced-scan-frame has-warning"}>
                  <div className="advanced-scan-frame-heading"><strong>{r.name}</strong>{clean ? <CheckCircle2 size={15} /> : <TriangleAlert size={15} />}</div>
                  {clean ? (
                    <p className="ok">No issues found</p>
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
      </section>

      <section className="advanced-export-panel">
        <div className="advanced-export-heading"><span><FileCheck2 size={14} /> PDF handoff</span><strong>{selectionNames.length} {selectionNames.length === 1 ? "file" : "files"} ready</strong></div>
        <button
          className="primary"
          onClick={handleExport}
          disabled={!metaComplete || selectionNames.length === 0 || exporting}
        >
          {exporting ? "Exporting…" : "Export as PDF"}
        </button>
        <p className="advanced-filename">{filenamePreview}</p>
        {!metaComplete && <p className="muted">Fill in file name/project/version first.</p>}
        {exportError && <p className="error">{exportError}</p>}
      </section>
    </div>
  );
}
