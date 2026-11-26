import React, { useMemo, useState } from "react";
import { BenchmarkCreatePayload, BenchmarkRow } from "../services/api";

interface BenchmarkMatrixViewProps {
  benchmarks: BenchmarkRow[];
  isLiveBackend: boolean;
  onCreateBenchmark: (payload: BenchmarkCreatePayload) => Promise<void>;
}

export const BenchmarkMatrixView: React.FC<BenchmarkMatrixViewProps> = ({
  benchmarks,
  isLiveBackend,
  onCreateBenchmark,
}) => {
  const [protocolFilter, setProtocolFilter] = useState<string>("ALL");
  const [selectedId, setSelectedId] = useState<number | null>(benchmarks[0]?.id ?? 1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const [formState, setFormState] = useState<BenchmarkCreatePayload>({
    pathway_code: "spiking_conformer",
    pathway_name: "Custom Spiking Conformer Run",
    validation_protocol: "HELD_OUT_CHB16_22",
    held_out_subject: "chb21",
    accuracy: 0.968,
    sensitivity: 0.952,
    specificity: 0.984,
    roc_auc: 0.986,
    pr_auc: 0.974,
    compute_ops_ratio: 0.1,
    spike_active_ratio: 0.59,
    notes: "Custom evaluation run logged from workbench.",
  });

  const protocols = useMemo(() => {
    const set = new Set(benchmarks.map((b) => b.validation_protocol));
    return ["ALL", ...Array.from(set)];
  }, [benchmarks]);

  const filtered = useMemo(
    () =>
      protocolFilter === "ALL"
        ? benchmarks
        : benchmarks.filter((b) => b.validation_protocol === protocolFilter),
    [benchmarks, protocolFilter]
  );

  const activeBenchmark =
    filtered.find((b) => b.id === selectedId) ?? filtered[0] ?? benchmarks[0] ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      await onCreateBenchmark(formState);
      setSubmitMessage("Benchmark run saved successfully.");
      setShowCreateForm(false);
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : "Failed to save benchmark.");
    } finally {
      setSubmitting(false);
    }
  }

  // Pareto SVG layout
  const w = 640;
  const h = 250;
  const padL = 56;
  const padR = 28;
  const padT = 22;
  const padB = 38;
  const pW = w - padL - padR;
  const pH = h - padT - padB;
  const toX = (ops: number) => padL + (Math.min(1.0, Math.max(0, ops)) / 1.0) * pW;
  const toY = (acc: number) => padT + (1 - (Math.min(1.0, Math.max(0.75, acc)) - 0.75) / 0.25) * pH;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
      {/* Top Row: Pareto Frontier (Obsidian Film) + Selected Pathway Clinical Dossier */}
      <div className="lab-top-grid" style={{ marginTop: 0 }}>
        <section className="mri-chamber">
          <div className="mri-header">
            <div>
              <h2 className="mri-title">PARETO FRONTIER // ACCURACY vs. COMPUTE OPS</h2>
              <div className="mri-meta-code font-mono-tech" style={{ marginTop: 2 }}>
                FIVE-PATHWAY EFFICIENCY LANDSCAPE · LOWER OPS RATIO = HIGHER SPARSITY
              </div>
            </div>
            <span className="mri-meta-code font-mono-tech">N = {filtered.length} RUNS</span>
          </div>

          <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: "block" }}>
            {/* Gridlines */}
            {[0.8, 0.85, 0.9, 0.95, 1.0].map((accTick) => {
              const y = toY(accTick);
              return (
                <g key={accTick}>
                  <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(255,145,194,0.14)" strokeDasharray="3 3" />
                  <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#ff9dc6" className="font-mono-tech">
                    {(accTick * 100).toFixed(0)}%
                  </text>
                </g>
              );
            })}
            {[0, 0.25, 0.5, 0.75, 1.0].map((opsTick) => {
              const x = toX(opsTick);
              return (
                <g key={opsTick}>
                  <line x1={x} y1={padT} x2={x} y2={h - padB} stroke="rgba(255,145,194,0.12)" />
                  <text x={x} y={h - 14} textAnchor="middle" fontSize="9" fill="#ff9dc6" className="font-mono-tech">
                    {opsTick.toFixed(2)}×
                  </text>
                </g>
              );
            })}

            {/* Axis Labels */}
            <text x={padL + pW / 2} y={h - 2} textAnchor="middle" fontSize="9" fill="#d9a2bb" className="font-mono-tech">
              COMPUTE OPS RATIO (RELATIVE TO DENSE BASELINE)
            </text>

            {/* Ideal Zone Highlight (Low Compute + High Accuracy) */}
            <rect
              x={padL}
              y={padT}
              width={pW * 0.24}
              height={pH * 0.28}
              fill="rgba(255, 71, 145, 0.1)"
              stroke="rgba(255, 110, 170, 0.4)"
              strokeDasharray="4 3"
              rx="4"
            />
            <text x={padL + 6} y={padT + 12} fontSize="8" fill="#ffb8d4" className="font-mono-tech">
              NEUROMORPHIC SWEET SPOT
            </text>

            {/* Data Points */}
            {filtered.map((row) => {
              const cx = toX(row.compute_ops_ratio);
              const cy = toY(row.accuracy);
              const isSel = activeBenchmark?.id === row.id;
              const radius = 6 + row.roc_auc * 8;
              const shortLabel = row.pathway_code.replace("_", " ").toUpperCase();

              return (
                <g
                  key={row.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedId(row.id)}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + (isSel ? 5 : 0)}
                    fill={isSel ? "rgba(255, 71, 145, 0.25)" : "transparent"}
                    stroke={isSel ? "#ffffff" : "transparent"}
                    strokeWidth="1.2"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill={row.pathway_code === "spiking_conformer" ? "#ff4791" : "rgba(255, 130, 180, 0.72)"}
                    stroke="#fff3f8"
                    strokeWidth={isSel ? 2 : 1.1}
                  />
                  <text
                    x={Math.min(w - 95, cx + radius + 6)}
                    y={cy + 3}
                    fontSize="8.5"
                    fontWeight={isSel ? "700" : "500"}
                    fill={isSel ? "#ffffff" : "#ffd2e5"}
                    className="font-mono-tech"
                  >
                    {shortLabel} ({(row.accuracy * 100).toFixed(1)}%)
                  </text>
                </g>
              );
            })}
          </svg>
        </section>

        {/* Selected Pathway Clinical Dossier */}
        <section className="ink-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {activeBenchmark ? (
            <>
              <div>
                <div className="ink-card-header">
                  <div>
                    <h2 className="ink-card-title">{activeBenchmark.pathway_name}</h2>
                    <div className="font-mono-tech" style={{ fontSize: "0.7rem", color: "var(--ink-muted)", marginTop: 3 }}>
                      PROTOCOL: {activeBenchmark.validation_protocol} · HELD-OUT: {activeBenchmark.held_out_subject.toUpperCase()}
                    </div>
                  </div>
                  <span className="ink-badge font-mono-tech">{activeBenchmark.pathway_code}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {[
                    { k: "ACCURACY", v: `${(activeBenchmark.accuracy * 100).toFixed(2)}%` },
                    { k: "SENSITIVITY", v: `${(activeBenchmark.sensitivity * 100).toFixed(2)}%` },
                    { k: "SPECIFICITY", v: `${(activeBenchmark.specificity * 100).toFixed(2)}%` },
                    { k: "ROC-AUC", v: activeBenchmark.roc_auc.toFixed(4) },
                    { k: "PR-AUC", v: activeBenchmark.pr_auc.toFixed(4) },
                    { k: "OPS RATIO", v: `${activeBenchmark.compute_ops_ratio.toFixed(2)}×` },
                  ].map((item) => (
                    <div
                      key={item.k}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "var(--bg-surface-tint)",
                        border: "1px solid var(--border-ink)",
                      }}
                    >
                      <div className="font-mono-tech" style={{ fontSize: "0.61rem", color: "var(--ink-muted)" }}>
                        {item.k}
                      </div>
                      <div className="font-mono-tech" style={{ fontSize: "0.96rem", fontWeight: 700, marginTop: 2 }}>
                        {item.v}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px dashed var(--border-ink-strong)",
                    background: "var(--bg-surface-elevated)",
                    fontSize: "0.78rem",
                    lineHeight: 1.5,
                    color: "var(--ink-secondary)",
                  }}
                >
                  <strong className="font-mono-tech" style={{ fontSize: "0.68rem", color: "var(--rose-600)", display: "block", marginBottom: 3 }}>
                    ARCHITECTURAL TELEMETRY NOTES
                  </strong>
                  {activeBenchmark.notes || "No clinical notes recorded."}
                  {activeBenchmark.spike_active_ratio !== null && (
                    <div className="font-mono-tech" style={{ marginTop: 6, fontSize: "0.7rem", color: "var(--ink-primary)" }}>
                      Spike Active Ratio: <strong>{(activeBenchmark.spike_active_ratio * 100).toFixed(1)}%</strong>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p>Select a benchmark pathway to inspect metrics.</p>
          )}
        </section>
      </div>

      {/* Benchmark Matrix Table & Log New Run Controls */}
      <section className="ink-card">
        <div className="ink-card-header" style={{ flexWrap: "wrap" }}>
          <div>
            <h2 className="ink-card-title">Five-Pathway Benchmark Matrix</h2>
            <div className="font-mono-tech" style={{ fontSize: "0.7rem", color: "var(--ink-muted)", marginTop: 2 }}>
              CLICK ANY ROW TO INSPECT · FILTER BY VALIDATION PROTOCOL
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="nav-tabs">
              {protocols.map((prot) => (
                <button
                  key={prot}
                  type="button"
                  className={`nav-tab font-mono-tech ${protocolFilter === prot ? "active" : ""}`}
                  style={{ padding: "5px 10px", fontSize: "0.68rem" }}
                  onClick={() => setProtocolFilter(prot)}
                >
                  {prot}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="run-cta"
              style={{ height: 34, padding: "0 14px", fontSize: "0.71rem" }}
              onClick={() => setShowCreateForm((v) => !v)}
            >
              {showCreateForm ? "Close Form" : "+ Log Benchmark Run"}
            </button>
          </div>
        </div>

        {submitMessage && (
          <div className="notice-banner" style={{ marginBottom: 12, marginTop: 0 }}>
            <span>{submitMessage}</span>
            <button type="button" className="btn-ghost" onClick={() => setSubmitMessage(null)}>
              Dismiss
            </button>
          </div>
        )}

        {showCreateForm && (
          <form
            onSubmit={handleSubmit}
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 10,
              border: "1px solid var(--border-rose)",
              background: "var(--bg-surface-tint)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 10,
            }}
          >
            <div className="field-group">
              <label className="field-label">Pathway Code</label>
              <select
                className="neuro-select"
                value={formState.pathway_code}
                onChange={(e) => setFormState({ ...formState, pathway_code: e.target.value })}
              >
                <option value="spiking_conformer">spiking_conformer</option>
                <option value="st_gnn">st_gnn</option>
                <option value="multidomain_ml">multidomain_ml</option>
                <option value="cwt_scalogram">cwt_scalogram</option>
                <option value="biomarker_indices">biomarker_indices</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">Pathway Name</label>
              <input
                className="neuro-input"
                required
                value={formState.pathway_name}
                onChange={(e) => setFormState({ ...formState, pathway_name: e.target.value })}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Protocol</label>
              <select
                className="neuro-select"
                value={formState.validation_protocol}
                onChange={(e) => setFormState({ ...formState, validation_protocol: e.target.value })}
              >
                <option value="LOSO">LOSO</option>
                <option value="LOPO">LOPO</option>
                <option value="HELD_OUT_CHB16_22">HELD_OUT_CHB16_22</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">Held-Out Subject</label>
              <input
                className="neuro-input"
                required
                value={formState.held_out_subject}
                onChange={(e) => setFormState({ ...formState, held_out_subject: e.target.value })}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Accuracy (0–1)</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                className="neuro-input"
                value={formState.accuracy}
                onChange={(e) => setFormState({ ...formState, accuracy: Number(e.target.value) })}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Sensitivity (0–1)</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                className="neuro-input"
                value={formState.sensitivity}
                onChange={(e) => setFormState({ ...formState, sensitivity: Number(e.target.value) })}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Specificity (0–1)</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                className="neuro-input"
                value={formState.specificity}
                onChange={(e) => setFormState({ ...formState, specificity: Number(e.target.value) })}
              />
            </div>

            <div className="field-group">
              <label className="field-label">ROC-AUC (0–1)</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                className="neuro-input"
                value={formState.roc_auc}
                onChange={(e) => setFormState({ ...formState, roc_auc: Number(e.target.value) })}
              />
            </div>

            <div className="field-group">
              <label className="field-label">PR-AUC (0–1)</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                className="neuro-input"
                value={formState.pr_auc}
                onChange={(e) => setFormState({ ...formState, pr_auc: Number(e.target.value) })}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Ops Ratio (0.01–2.0)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="2.0"
                className="neuro-input"
                value={formState.compute_ops_ratio}
                onChange={(e) => setFormState({ ...formState, compute_ops_ratio: Number(e.target.value) })}
              />
            </div>

            <div className="field-group" style={{ gridColumn: "span 2" }}>
              <label className="field-label">Clinical / Architectural Notes</label>
              <input
                className="neuro-input"
                value={formState.notes}
                onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
              />
            </div>

            <div className="field-group" style={{ justifyContent: "flex-end" }}>
              <button type="submit" className="run-cta" disabled={submitting}>
                {submitting ? "Saving..." : isLiveBackend ? "Save to FastAPI" : "Save Locally"}
              </button>
            </div>
          </form>
        )}

        <div className="neuro-table-wrap">
          <table className="neuro-table">
            <thead>
              <tr>
                <th>Pathway</th>
                <th>Protocol</th>
                <th>Subject</th>
                <th>Accuracy</th>
                <th>Sensitivity</th>
                <th>Specificity</th>
                <th>ROC-AUC</th>
                <th>PR-AUC</th>
                <th>Ops Ratio</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const isSel = activeBenchmark?.id === row.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    style={{
                      cursor: "pointer",
                      background: isSel ? "var(--bg-pill)" : undefined,
                    }}
                  >
                    <td style={{ fontWeight: 700 }}>{row.pathway_name}</td>
                    <td>
                      <span className="ink-badge font-mono-tech">{row.validation_protocol}</span>
                    </td>
                    <td className="font-mono-tech">{row.held_out_subject}</td>
                    <td className="font-mono-tech" style={{ fontWeight: 700 }}>
                      {(row.accuracy * 100).toFixed(2)}%
                    </td>
                    <td className="font-mono-tech">{(row.sensitivity * 100).toFixed(2)}%</td>
                    <td className="font-mono-tech">{(row.specificity * 100).toFixed(2)}%</td>
                    <td className="font-mono-tech">{row.roc_auc.toFixed(4)}</td>
                    <td className="font-mono-tech">{row.pr_auc.toFixed(4)}</td>
                    <td className="font-mono-tech" style={{ color: "var(--rose-600)", fontWeight: 700 }}>
                      {row.compute_ops_ratio.toFixed(2)}×
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
