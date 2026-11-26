import React, { useMemo } from "react";
import { SpikingConformerOutput } from "../services/api";
import { createSeededRng } from "../services/localSimulation";

interface SpikingConformerPanelProps {
  conformer: SpikingConformerOutput | undefined;
  seed: number;
}

export const SpikingConformerPanel: React.FC<SpikingConformerPanelProps> = ({
  conformer,
  seed,
}) => {
  const confidence = conformer?.confidence ?? 0.87;
  const spikeRate = conformer?.spike_rate ?? 0.36;
  const activeRatio = conformer?.compute_active_ratio ?? 0.58;
  const opsReduction = conformer?.estimated_ops_reduction_x ?? 10.0;
  const predictedState = conformer?.predicted_state ?? "preictal";

  // Build deterministic 14 x 8 LIF spike raster illustrating T_th = 2 masking
  const raster = useMemo(() => {
    const rng = createSeededRng(seed + Math.round(activeRatio * 1000) + Math.round(spikeRate * 10000));
    const units = 14;
    const timesteps = 8;
    const activeTarget = Math.max(3, Math.min(units - 2, Math.round(activeRatio * units)));
    const activeFlags = Array.from({ length: units }, (_, idx) => idx < activeTarget);

    // Deterministic shuffle of active units
    for (let i = activeFlags.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = activeFlags[i];
      activeFlags[i] = activeFlags[j];
      activeFlags[j] = tmp;
    }

    const visualFireProb = Math.max(0.32, Math.min(0.84, spikeRate * 1.4 + 0.34));
    const rows: Array<{ activeAfterMask: boolean; spikes: boolean[] }> = [];

    for (let u = 0; u < units; u++) {
      const firedEarly = activeFlags[u];
      const spikes: boolean[] = [];
      for (let t = 0; t < timesteps; t++) {
        if (t < 2) {
          // Ensure active units fire at least once during t in {0, 1} calibration
          const fires = firedEarly ? (t === 0 ? rng() < 0.68 : true) : false;
          spikes.push(fires);
        } else {
          spikes.push(firedEarly ? rng() < visualFireProb : false);
        }
      }
      if (firedEarly && !spikes[0] && !spikes[1]) {
        spikes[1] = true;
      }
      rows.push({ activeAfterMask: firedEarly, spikes });
    }
    return rows;
  }, [seed, spikeRate, activeRatio]);

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(1, Math.max(0, confidence)));

  return (
    <section className="ink-card">
      <div className="ink-card-header">
        <div>
          <h2 className="ink-card-title">
            <span>Neuromorphic Spiking Conformer</span>
          </h2>
          <div className="font-mono-tech" style={{ fontSize: "0.7rem", color: "var(--ink-muted)", marginTop: 2 }}>
            T=8 LIF NEURONS · 1×25 TEMPORAL + 22×1 SPATIAL · SOFTMAX-FREE SSA
          </div>
        </div>
        <span className="ink-badge font-mono-tech">T_th = 2 MASKING</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 18, alignItems: "center" }}>
        {/* Circular Confidence Gauge */}
        <div style={{ position: "relative", width: 84, height: 84, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="84" height="84" viewBox="0 0 84 84">
            <circle cx="42" cy="42" r={radius} fill="none" stroke="var(--bg-surface-tint)" strokeWidth="7" />
            <circle
              cx="42"
              cy="42"
              r={radius}
              fill="none"
              stroke="var(--rose-500)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 42 42)"
              style={{ transition: "stroke-dashoffset 0.35s ease" }}
            />
          </svg>
          <div style={{ position: "absolute", textAlign: "center" }}>
            <div className="font-mono-tech" style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink-primary)" }}>
              {(confidence * 100).toFixed(1)}%
            </div>
            <div className="font-mono-tech" style={{ fontSize: "0.56rem", color: "var(--ink-muted)" }}>
              CONF
            </div>
          </div>
        </div>

        {/* Conformer Predictions & Sparsity Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--bg-surface-tint)", border: "1px solid var(--border-ink)" }}>
            <div className="font-mono-tech" style={{ fontSize: "0.64rem", color: "var(--ink-muted)", textTransform: "uppercase" }}>
              Predicted State
            </div>
            <div
              className="font-mono-tech"
              style={{
                fontSize: "0.96rem",
                fontWeight: 700,
                textTransform: "uppercase",
                color:
                  predictedState === "ictal"
                    ? "var(--status-ictal)"
                    : predictedState === "preictal"
                    ? "var(--rose-600)"
                    : "var(--status-interictal)",
              }}
            >
              {predictedState}
            </div>
          </div>

          <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--bg-surface-tint)", border: "1px solid var(--border-ink)" }}>
            <div className="font-mono-tech" style={{ fontSize: "0.64rem", color: "var(--ink-muted)", textTransform: "uppercase" }}>
              Ops Reduction
            </div>
            <div className="font-mono-tech" style={{ fontSize: "0.96rem", fontWeight: 700, color: "var(--ink-primary)" }}>
              {opsReduction.toFixed(1)}× <span style={{ fontSize: "0.68rem", color: "var(--ink-muted)" }}>vs Dense</span>
            </div>
          </div>

          <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--bg-surface-tint)", border: "1px solid var(--border-ink)" }}>
            <div className="font-mono-tech" style={{ fontSize: "0.64rem", color: "var(--ink-muted)", textTransform: "uppercase" }}>
              Mean Spike Rate
            </div>
            <div className="font-mono-tech" style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--ink-primary)" }}>
              {(spikeRate * 100).toFixed(2)}%
            </div>
          </div>

          <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--bg-surface-tint)", border: "1px solid var(--border-ink)" }}>
            <div className="font-mono-tech" style={{ fontSize: "0.64rem", color: "var(--ink-muted)", textTransform: "uppercase" }}>
              Active Compute Ratio
            </div>
            <div className="font-mono-tech" style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--ink-primary)" }}>
              {(activeRatio * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* LIF T=0..7 Spike Raster Visualizer */}
      <div style={{ marginTop: 14 }}>
        <div
          className="font-mono-tech"
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.67rem",
            color: "var(--ink-muted)",
            marginBottom: 6,
          }}
        >
          <span>LIF MEMBRANE SPIKE RASTER (14 HIDDEN UNITS × T=8 STEPS)</span>
          <span style={{ color: "var(--rose-600)", fontWeight: 700 }}>GATE @ T_th = 2</span>
        </div>

        <div
          style={{
            padding: 10,
            borderRadius: 10,
            background: "#12090e",
            border: "1px solid rgba(255, 110, 170, 0.32)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "46px repeat(8, 1fr)", gap: 4, alignItems: "center", marginBottom: 4 }}>
            <span className="font-mono-tech" style={{ fontSize: "0.6rem", color: "#c992aa" }}>
              UNIT
            </span>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((t) => (
              <span
                key={t}
                className="font-mono-tech"
                style={{
                  textAlign: "center",
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  color: t < 2 ? "#ffd6e8" : "#ff6da9",
                  borderBottom: t === 2 ? "2px solid #ff4791" : "1px solid rgba(255,140,190,0.2)",
                  paddingBottom: 2,
                }}
              >
                t={t}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {raster.map((row, uIdx) => (
              <div
                key={uIdx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "46px repeat(8, 1fr)",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                <span className="font-mono-tech" style={{ fontSize: "0.6rem", color: row.activeAfterMask ? "#ffd6e8" : "#785363" }}>
                  H{String(uIdx + 1).padStart(2, "0")}
                </span>
                {row.spikes.map((fired, tIdx) => {
                  const isPruned = tIdx >= 2 && !row.activeAfterMask;
                  return (
                    <div
                      key={tIdx}
                      title={`Unit H${uIdx + 1} @ t=${tIdx}: ${isPruned ? "Masked by T_th=2" : fired ? "LIF Spike (V ≥ 1.0)" : "Subthreshold"}`}
                      style={{
                        height: 9,
                        borderRadius: 2,
                        background: isPruned
                          ? "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 4px)"
                          : fired
                          ? "#ff4791"
                          : "rgba(255, 145, 194, 0.12)",
                        boxShadow: fired ? "0 0 6px rgba(255, 71, 145, 0.7)" : undefined,
                        border: tIdx === 2 ? "1px solid rgba(255, 110, 170, 0.35)" : "1px solid transparent",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div
            className="font-mono-tech"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 7,
              fontSize: "0.62rem",
              color: "#d49eb7",
            }}
          >
            <span>■ SPIKE (V_mem ≥ 1.0, τ_m=2.0)</span>
            <span>░ QUIESCENT MASKED AFTER t=2</span>
          </div>
        </div>
      </div>
    </section>
  );
};
