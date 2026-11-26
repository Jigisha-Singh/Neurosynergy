import React from "react";
import { AnalysisResponse, SubjectRecord } from "../services/api";

export interface TelemetryHistoryEntry {
  id: number;
  timestamp: string;
  subject_code: string;
  state_hint: string;
  predicted_state: string;
  confidence: number;
  ds_qi: number;
  sii_composite: number;
  laplacian_lambda_2: number;
}

interface CohortAtlasViewProps {
  subjects: SubjectRecord[];
  heldOutCohort: string[];
  activeSubject: string;
  history: TelemetryHistoryEntry[];
  latestAnalysis: AnalysisResponse | null;
  onSelectSubjectForLab: (subjectCode: string) => void;
}

export const CohortAtlasView: React.FC<CohortAtlasViewProps> = ({
  subjects,
  heldOutCohort,
  activeSubject,
  history,
  onSelectSubjectForLab,
}) => {
  const losoSubjects = subjects.filter((s) => s.cohort_group === "LOSO_POOL");
  const heldOutSubjects = subjects.filter((s) => s.cohort_group !== "LOSO_POOL");
  const maxSeizures = Math.max(...subjects.map((s) => s.seizure_count), 10);

  const renderSubjectGroup = (title: string, badge: string, list: SubjectRecord[]) => (
    <section className="ink-card">
      <div className="ink-card-header">
        <div>
          <h2 className="ink-card-title">{title}</h2>
          <div className="font-mono-tech" style={{ fontSize: "0.7rem", color: "var(--ink-muted)", marginTop: 2 }}>
            CHB-MIT PEDIATRIC SCALP EEG COHORT · 256 HZ · 22 CHANNELS
          </div>
        </div>
        <span className="ink-badge font-mono-tech">{badge}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>
        {list.map((subj) => {
          const isCurrent = subj.subject_code === activeSubject;
          return (
            <div
              key={subj.subject_code}
              style={{
                padding: 12,
                borderRadius: 10,
                border: isCurrent ? "1.5px solid var(--rose-500)" : "1px solid var(--border-ink)",
                background: isCurrent ? "var(--bg-pill)" : "var(--bg-surface-tint)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="font-mono-tech" style={{ fontSize: "0.98rem", fontWeight: 700 }}>
                    {subj.subject_code.toUpperCase()}
                  </span>
                  <span className="font-mono-tech" style={{ fontSize: "0.7rem", color: "var(--ink-muted)" }}>
                    {subj.age_years}Y · {subj.sex}
                  </span>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div
                    className="font-mono-tech"
                    style={{ display: "flex", justifyContent: "space-between", fontSize: "0.66rem", color: "var(--ink-secondary)", marginBottom: 4 }}
                  >
                    <span>SEIZURE EVENTS</span>
                    <strong>{subj.seizure_count}</strong>
                  </div>
                  <div className="bar-track" style={{ height: 6 }}>
                    <div className="bar-fill" style={{ width: `${(subj.seizure_count / maxSeizures) * 100}%` }} />
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-ghost"
                style={{ width: "100%", textAlign: "center" }}
                onClick={() => onSelectSubjectForLab(subj.subject_code)}
              >
                {isCurrent ? "Active in Signal Lab →" : "Load into Signal Lab →"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
      <div className="ink-card" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h2 className="ink-card-title">Held-Out Generalization Cohort Lock</h2>
          <div className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--ink-muted)", marginTop: 2 }}>
            STRICT ZERO-LEAKAGE CROSS-PATIENT EVALUATION GROUP: {heldOutCohort.join(" · ").toUpperCase()}
          </div>
        </div>
        <div className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--rose-600)", fontWeight: 700 }}>
          {subjects.length} SUBJECTS INDEXED · {history.length} SESSION WINDOWS LOGGED
        </div>
      </div>

      <div className="lab-bottom-grid" style={{ marginTop: 0 }}>
        {renderSubjectGroup("LOSO Training & Cross-Validation Pool", "LOSO_POOL", losoSubjects)}
        {renderSubjectGroup("Held-Out Pediatric Evaluation Cohort", "CHB16–CHB22", heldOutSubjects)}
      </div>

      {/* Session Telemetry History */}
      <section className="ink-card">
        <div className="ink-card-header">
          <div>
            <h2 className="ink-card-title">Session Telemetry Run Log</h2>
            <div className="font-mono-tech" style={{ fontSize: "0.7rem", color: "var(--ink-muted)", marginTop: 2 }}>
              MIRRORS BACKEND TELEMETRY HISTORY · DS-Qi, SII & LAPLACIAN λ₂ DRIFT
            </div>
          </div>
          <span className="ink-badge font-mono-tech">{history.length} EPOCHS</span>
        </div>

        {history.length === 0 ? (
          <p className="font-mono-tech" style={{ fontSize: "0.76rem", color: "var(--ink-muted)", margin: 0 }}>
            Run a 5-second EEG window in the Signal & Spiking Lab to log epoch telemetry here.
          </p>
        ) : (
          <div className="neuro-table-wrap">
            <table className="neuro-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Subject</th>
                  <th>Input Hint</th>
                  <th>Conformer Pred</th>
                  <th>Confidence</th>
                  <th>DS-Qi</th>
                  <th>SII Composite</th>
                  <th>Laplacian λ₂</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono-tech" style={{ color: "var(--ink-muted)" }}>
                      {item.timestamp}
                    </td>
                    <td className="font-mono-tech" style={{ fontWeight: 700 }}>
                      {item.subject_code.toUpperCase()}
                    </td>
                    <td className="font-mono-tech" style={{ textTransform: "uppercase" }}>
                      {item.state_hint}
                    </td>
                    <td>
                      <span className="ink-badge font-mono-tech">{item.predicted_state}</span>
                    </td>
                    <td className="font-mono-tech">{(item.confidence * 100).toFixed(1)}%</td>
                    <td className="font-mono-tech" style={{ fontWeight: 700 }}>
                      {item.ds_qi.toFixed(4)}
                    </td>
                    <td className="font-mono-tech">{item.sii_composite.toFixed(2)}</td>
                    <td className="font-mono-tech" style={{ color: "var(--rose-600)", fontWeight: 700 }}>
                      {item.laplacian_lambda_2.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
