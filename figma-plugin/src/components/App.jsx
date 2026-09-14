import React, { useEffect, useState, useCallback, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import {
  CheckCircle2,
  FileCheck2,
  FileText,
  Layers3,
  MoonStar,
  ScanSearch,
  Sparkles,
  Sun,
  TriangleAlert,
} from "lucide-react";

const FILE_NAME_LIMIT = 40;

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

async function mergePdfFiles(files) {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const source = await PDFDocument.load(new Uint8Array(file.bytes));
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return merged.save();
}

function sanitizeFilenamePart(value) {
  return String(value || "").trim().replace(/[^a-z0-9]+/gi, "");
}

function todayStamp() {
  const date = new Date();
  return `${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}${String(date.getFullYear()).slice(-2)}`;
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
      ? { fileName: "AcmeCoHomepage", version: "3", includeDate: true }
      : { fileName: "", version: "", includeDate: true }
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
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("owdia-dark-mode", darkMode);
    return () => document.body.classList.remove("owdia-dark-mode");
  }, [darkMode]);

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
      if (msg.type === "selection-changed") {
        setSelectionNames(msg.selectionNames);
        setScanResults(null);
        setScanError("");
        setExportError("");
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
        if (msg.purpose === "master") {
          mergePdfFiles(msg.files)
            .then((bytes) => {
              const currentMeta = metaRef.current;
              const datePart = currentMeta.includeDate ? `_${todayStamp()}` : "";
              const name = `${sanitizeFilenamePart(currentMeta.fileName)}_Master${datePart}_v${sanitizeFilenamePart(currentMeta.version)}.pdf`;
              downloadFile(name, bytes);
            })
            .catch((error) => setExportError(`Master PDF failed: ${error.message}`));
        } else {
          msg.files.forEach((f) => downloadFile(f.name, f.bytes));
        }
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
    postToPlugin({ type: "export", purpose: "individual" });
  }, []);

  const handleMasterExport = useCallback(() => {
    setExportError("");
    setExporting(true);
    postToPlugin({ type: "export", purpose: "master" });
  }, []);

  const handleCancel = useCallback(() => {
    postToPlugin({ type: "close" });
  }, []);

  const metaComplete = meta.fileName && meta.version;
  const filenamePreview = metaComplete
    ? `${meta.fileName}_Frame${meta.includeDate ? "_MMDDYY" : ""}_v${meta.version}.pdf`
    : `FileName_Frame${meta.includeDate ? "_MMDDYY" : ""}_v#.pdf`;

  return (
    <div className={darkMode ? "app advanced-app is-dark" : "app advanced-app"}>
      <header className="advanced-header">
        <div>
          <p className="advanced-eyebrow"><Sparkles size={11} /> OWDIA / DELIVERY TOOL</p>
          <h1>Export Assistant</h1>
          <p>Review once. Ship with confidence.</p>
        </div>
        <div className="advanced-header-actions">
          <span className={selectionNames.length ? "advanced-status is-ready" : "advanced-status"}>
            {selectionNames.length ? <><CheckCircle2 size={12} /> Ready</> : "Waiting"}
          </span>
          <button
            className="advanced-theme-toggle"
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Use light mode" : "Use dark mode"}
            aria-label={darkMode ? "Use light mode" : "Use dark mode"}
          >
            {darkMode ? <Sun size={16} strokeWidth={2.5} /> : <MoonStar size={16} strokeWidth={2.5} />}
          </button>
        </div>
      </header>

      <form onSubmit={handleSaveMeta} className="advanced-panel advanced-form">
        <div className="advanced-section-heading">
          <span className="advanced-icon"><FileText size={15} /></span>
          <div><h2>Export details</h2><p>Reuse these details on future exports from this file.</p></div>
          {saved && <span className="advanced-saved">Saved</span>}
        </div>
        <div className="advanced-field-row">
          <label>
            File name
            <input
              value={meta.fileName}
              onChange={(e) => setMeta({ ...meta, fileName: e.target.value })}
              placeholder="AcmeCoHomepage"
              maxLength={FILE_NAME_LIMIT}
            />
            <span className="advanced-character-count">{meta.fileName.length} / {FILE_NAME_LIMIT}</span>
          </label>
          <label className="advanced-version-field">
            Version
            <input value={meta.version} onChange={(e) => setMeta({ ...meta, version: e.target.value.replace(/^v/i, "") })} placeholder="3" />
          </label>
        </div>
        <label className="advanced-toggle">
          <span>
            <strong>Include date</strong>
            <small>Add MMDDYY to each filename.</small>
          </span>
          <input
            className="advanced-toggle-input"
            type="checkbox"
            checked={meta.includeDate}
            onChange={(e) => setMeta({ ...meta, includeDate: e.target.checked })}
          />
          <span className="advanced-toggle-track" aria-hidden="true" />
        </label>
        <button className="advanced-secondary" type="submit">Save export details</button>
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
              <li key={i}><span>{name}</span><span className="frame-ready">Ready</span></li>
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
        <div className="advanced-export-actions">
          <button className="advanced-cancel" type="button" onClick={handleCancel}>Cancel</button>
          <button
            className="primary"
            onClick={handleExport}
            disabled={!metaComplete || selectionNames.length === 0 || exporting}
          >
            {exporting ? "Exporting…" : "Export as PDF"}
          </button>
        </div>
        <button className="advanced-master" type="button" onClick={handleMasterExport} disabled={!metaComplete || selectionNames.length === 0 || exporting}>
          Export master PDF
        </button>
        <p className="advanced-filename">{filenamePreview}</p>
        {!metaComplete && <p className="muted">Fill in file name and version first.</p>}
        {exportError && <p className="error">{exportError}</p>}
      </section>
    </div>
  );
}
