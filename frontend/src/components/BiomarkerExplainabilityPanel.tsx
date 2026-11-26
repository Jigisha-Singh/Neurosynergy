import React from "react";
import { BiomarkerOutput, ExplainabilitySummary } from "../services/api";

interface BiomarkerExplainabilityPanelProps {
  biomarkers: BiomarkerOutput | undefined;
  explainability: ExplainabilitySummary | undefined;
}

export const BiomarkerExplainabilityPanel: React.FC<BiomarkerExplainabilityPanelProps> = ({
  biomarkers,
  explainability,
}) => {
  const topFeatures = explainability?.top_features ?? [
    { name: "Peak-to-Peak Amplitude (Time)", shap: 0.342 },
    { name: "Posterior Theta/Alpha + Beta wPLI", shap: 0.289 },
    { name: "Alpha/Beta PSD Ratio (Freq)", shap: 0.218 },
    { name: "db4 Wavelet & Perm Entropy", shap: 0.151 },
  ];

  const maxShap = Math.max(...topFeatures.map((f) => f.shap), 0.35);

  return (
    <section className="ink-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <div className="ink-card-header">
          <div>
            <h2 className="ink-card-title">
              <span>Clinical Biomarkers & SHAP Attribution</span>
            </h2>
            <div className="font-mono-tech" style={{ fontSize: "0.7rem", color: "var(--ink-muted)", marginTop: 2 }}>
              COMPACT DS-Qi & SII INDICES · FOOOF SPECTRUM · EXPLAINABILITY
            </div>
          </div>
          <span className="ink-badge font-mono-tech">0.02× ULTRA-LIGHT</span>
        </div>

        {/* Two Clinical Biomarker Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <div
            style={{
              padding: "11px 12px",
              borderRadius: 10,
              background: "var(--bg-surface-tint)",
              border: "1px solid var(--border-ink)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="font-mono-tech" style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--rose-600)" }}>
                DS-Qi INDEX
              </span>
              <span className="font-mono-tech" style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--ink-primary)" }}>
                {biomarkers ? biomarkers.ds_qi.toFixed(4) : "—"}
              </span>
            </div>
            <div className="font-mono-tech" style={{ fontSize: "0.65rem", color: "var(--ink-muted)", marginTop: 2 }}>
              θ/α_post + (1 − wPLI_β)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
              <div>
                <div className="font-mono-tech" style={{ fontSize: "0.61rem", color: "var(--ink-muted)" }}>
                  POST θ/α
                </div>
                <div className="font-mono-tech" style={{ fontSize: "0.84rem", fontWeight: 700 }}>
                  {biomarkers ? biomarkers.posterior_theta_alpha.toFixed(4) : "—"}
                </div>
              </div>
              <div>
                <div className="font-mono-tech" style={{ fontSize: "0.61rem", color: "var(--ink-muted)" }}>
                  MEAN β-wPLI
                </div>
                <div className="font-mono-tech" style={{ fontSize: "0.84rem", fontWeight: 700 }}>
                  {biomarkers ? biomarkers.mean_wpli_beta.toFixed(4) : "—"}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "11px 12px",
              borderRadius: 10,
              background: "var(--bg-surface-tint)",
              border: "1px solid var(--border-ink)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="font-mono-tech" style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--rose-600)" }}>
                SII COMPOSITE
              </span>
              <span className="font-mono-tech" style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--ink-primary)" }}>
                {biomarkers ? biomarkers.sii_composite.toFixed(2) : "—"}
              </span>
            </div>
            <div className="font-mono-tech" style={{ fontSize: "0.65rem", color: "var(--ink-muted)", marginTop: 2 }}>
              P_δ + LineLen + log(Var)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginTop: 8 }}>
              <div>
                <div className="font-mono-tech" style={{ fontSize: "0.59rem", color: "var(--ink-muted)" }}>
                  P_δ
                </div>
                <div className="font-mono-tech" style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                  {biomarkers ? biomarkers.p_delta.toFixed(3) : "—"}
                </div>
              </div>
              <div>
                <div className="font-mono-tech" style={{ fontSize: "0.59rem", color: "var(--ink-muted)" }}>
                  LINE LEN
                </div>
                <div className="font-mono-tech" style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                  {biomarkers ? biomarkers.line_length.toFixed(1) : "—"}
                </div>
              </div>
              <div>
                <div className="font-mono-tech" style={{ fontSize: "0.59rem", color: "var(--ink-muted)" }}>
                  LOG VAR
                </div>
                <div className="font-mono-tech" style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                  {biomarkers ? biomarkers.log_variance.toFixed(3) : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SHAP Explainability Attribution Bars */}
      <div style={{ marginTop: 14 }}>
        <div
          className="font-mono-tech"
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.68rem",
            color: "var(--ink-muted)",
            marginBottom: 8,
          }}
        >
          <span>CROSS-PATIENT SHAP IMPORTANCE DRIVERS</span>
          <span>
            FOOOF χ={explainability ? explainability.aperiodic_exponent.toFixed(2) : "1.52"} · PEAK{" "}
            {explainability ? explainability.periodic_peak_hz.toFixed(1) : "6.0"} HZ
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {topFeatures.map((feat, idx) => {
            const pct = Math.min(100, Math.round((feat.shap / maxShap) * 100));
            return (
              <div key={feat.name}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.76rem",
                    marginBottom: 4,
                    color: "var(--ink-primary)",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    <span className="font-mono-tech" style={{ color: "var(--rose-600)", marginRight: 6 }}>
                      0{idx + 1}
                    </span>
                    {feat.name}
                  </span>
                  <span className="font-mono-tech" style={{ fontWeight: 700 }}>
                    +{feat.shap.toFixed(3)}
                  </span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
