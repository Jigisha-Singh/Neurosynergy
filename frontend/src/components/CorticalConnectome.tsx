import React, { useMemo, useState } from "react";
import { GraphTopologyOutput, PhysiologicalState } from "../services/api";

interface CorticalConnectomeProps {
  topology: GraphTopologyOutput | undefined;
  stateHint: PhysiologicalState;
  seed: number;
}

interface ElectrodeNode {
  id: string;
  x: number;
  y: number;
  region: string;
  isPosterior: boolean;
}

const ELECTRODES: ElectrodeNode[] = [
  { id: "Fp1", x: 122, y: 66, region: "Prefrontal L", isPosterior: false },
  { id: "Fp2", x: 178, y: 66, region: "Prefrontal R", isPosterior: false },
  { id: "F7", x: 82, y: 102, region: "Inf. Frontal L", isPosterior: false },
  { id: "F3", x: 118, y: 105, region: "Frontal L", isPosterior: false },
  { id: "Fz", x: 150, y: 98, region: "Midline Frontal", isPosterior: false },
  { id: "F4", x: 182, y: 105, region: "Frontal R", isPosterior: false },
  { id: "F8", x: 218, y: 102, region: "Inf. Frontal R", isPosterior: false },
  { id: "T7", x: 64, y: 150, region: "Temporal L", isPosterior: false },
  { id: "C3", x: 108, y: 150, region: "Central L", isPosterior: false },
  { id: "Cz", x: 150, y: 150, region: "Vertex", isPosterior: false },
  { id: "C4", x: 192, y: 150, region: "Central R", isPosterior: false },
  { id: "T8", x: 236, y: 150, region: "Temporal R", isPosterior: false },
  { id: "P7", x: 80, y: 196, region: "Posterior Temp L", isPosterior: true },
  { id: "P3", x: 118, y: 194, region: "Parietal L", isPosterior: true },
  { id: "Pz", x: 150, y: 198, region: "Midline Parietal", isPosterior: true },
  { id: "P4", x: 182, y: 194, region: "Parietal R", isPosterior: true },
  { id: "P8", x: 220, y: 196, region: "Posterior Temp R", isPosterior: true },
  { id: "O1", x: 124, y: 234, region: "Occipital L", isPosterior: true },
  { id: "O2", x: 176, y: 234, region: "Occipital R", isPosterior: true },
];

export const CorticalConnectome: React.FC<CorticalConnectomeProps> = ({
  topology,
  stateHint,
  seed,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>("P3");

  const lambda2 = topology?.laplacian_lambda_2 ?? (stateHint === "ictal" ? 0.91 : 0.69);
  const meanWpli = topology?.mean_wpli_weight ?? (stateHint === "ictal" ? 0.52 : 0.34);
  const meanPcc = topology?.mean_pcc_weight ?? (stateHint === "ictal" ? 0.61 : 0.39);

  // Deterministically generate anatomically plausible wPLI edges weighted by topology metrics
  const edges = useMemo(() => {
    const pairs: Array<{ a: ElectrodeNode; b: ElectrodeNode; weight: number }> = [];
    for (let i = 0; i < ELECTRODES.length; i++) {
      for (let j = i + 1; j < ELECTRODES.length; j++) {
        const a = ELECTRODES[i];
        const b = ELECTRODES[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const hash = Math.abs(Math.sin((i + 1) * 19.3 + (j + 1) * 7.7 + seed * 0.13));
        const baseConn = dist < 85 ? 0.55 + 0.45 * hash : 0.25 + 0.55 * hash;
        const w = Math.min(0.98, baseConn * (0.55 + meanWpli * 0.95));
        if (w > 0.38 || (a.isPosterior && b.isPosterior && w > 0.26)) {
          pairs.push({ a, b, weight: w });
        }
      }
    }
    return pairs.sort((u, v) => u.weight - v.weight).slice(-32);
  }, [meanWpli, seed]);

  const activeNode = ELECTRODES.find((e) => e.id === selectedId) ?? null;

  return (
    <section className="mri-chamber" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div className="mri-header" style={{ marginBottom: 8 }}>
        <div>
          <h2 className="mri-title">
            <span>AXIAL MRI // wPLI TOPOLOGY</span>
          </h2>
          <div className="mri-meta-code font-mono-tech" style={{ marginTop: 2 }}>
            AFL HEMO · 2 IMA 9/20 · TRA&gt;COR(21.0)
          </div>
        </div>
        <span
          className="font-mono-tech"
          style={{
            fontSize: "0.68rem",
            padding: "3px 8px",
            borderRadius: 999,
            border: "1px solid rgba(255, 110, 170, 0.4)",
            background: "rgba(255, 71, 145, 0.16)",
            color: "#ffd6e8",
          }}
        >
          λ₂ = {lambda2.toFixed(4)}
        </span>
      </div>

      {/* Axial MRI Scan + 10-20 Graph SVG */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10, alignItems: "center" }}>
        <svg viewBox="0 0 300 282" width="100%" style={{ maxHeight: 258, display: "block", margin: "0 auto" }}>
          <defs>
            <radialGradient id="axialBrainGlow" cx="50%" cy="50%" r="52%">
              <stop offset="0%" stopColor="#ffd7e8" stopOpacity="0.28" />
              <stop offset="52%" stopColor="#ff4791" stopOpacity="0.22" />
              <stop offset="82%" stopColor="#851142" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#090306" stopOpacity="0" />
            </radialGradient>
            <filter id="roseGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Left MRI 5cm calibration tick scale */}
          <g stroke="#ff8dbd" strokeWidth="0.9" opacity="0.72" className="font-mono-tech" fontSize="8" fill="#ff9dc6">
            <line x1="16" y1="48" x2="16" y2="232" />
            {[0, 1, 2, 3, 4, 5].map((t) => {
              const y = 48 + t * 36.8;
              return <line key={t} x1="16" y1={y} x2="22" y2={y} />;
            })}
            <text x="12" y="246">5cm</text>
            <text x="242" y="26">RAH</text>
            <text x="234" y="272">W 1370</text>
            <text x="12" y="272">C 707</text>
          </g>

          {/* Skull & Axial Brain Parenchyma Contours (Image 1 rose MRI luminescence) */}
          <ellipse cx="150" cy="150" rx="108" ry="120" fill="url(#axialBrainGlow)" stroke="#ff73ad" strokeWidth="2.2" opacity="0.9" />
          <ellipse cx="150" cy="150" rx="98" ry="110" fill="rgba(255, 71, 145, 0.08)" stroke="#ffd6e8" strokeWidth="1" opacity="0.6" />
          {/* Cortical sulci & midline longitudinal fissure */}
          <path d="M150 42 L150 258" stroke="#ff88b8" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
          <path
            d="M150 108 C134 114, 130 138, 140 156 C130 174, 136 196, 150 198 C164 196, 170 174, 160 156 C170 138, 166 114, 150 108 Z"
            fill="rgba(11, 4, 8, 0.72)"
            stroke="#ff62a3"
            strokeWidth="1.2"
          />
          {/* Posterior Theta/Alpha biomarker focal zone halo */}
          <ellipse
            cx="150"
            cy="214"
            rx="64"
            ry="32"
            fill="rgba(255, 71, 145, 0.14)"
            stroke="#ff4791"
            strokeWidth="1"
            strokeDasharray="4 3"
          />

          {/* Functional wPLI / PCC Connectivity Edges */}
          {edges.map(({ a, b, weight }, idx) => {
            const connectedToSelected = selectedId && (a.id === selectedId || b.id === selectedId);
            const dimmed = selectedId && !connectedToSelected;
            return (
              <line
                key={`${a.id}-${b.id}-${idx}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={connectedToSelected ? "#ffffff" : "#ff4791"}
                strokeWidth={connectedToSelected ? 1.8 : 0.7 + weight * 1.3}
                opacity={dimmed ? 0.12 : 0.28 + weight * 0.58}
                filter={connectedToSelected ? "url(#roseGlow)" : undefined}
              />
            );
          })}

          {/* 10-20 Scalp Electrode Nodes */}
          {ELECTRODES.map((node) => {
            const isSel = node.id === selectedId;
            return (
              <g
                key={node.id}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedId(isSel ? null : node.id)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSel ? 9.5 : node.isPosterior ? 7 : 5.8}
                  fill={isSel ? "#ffffff" : node.isPosterior ? "#ff4791" : "#220d17"}
                  stroke={isSel ? "#ff4791" : "#ffc7df"}
                  strokeWidth={isSel ? 2 : 1.2}
                />
                <text
                  x={node.x}
                  y={node.y + (node.y > 220 ? 18 : -13)}
                  textAnchor="middle"
                  fontSize="8.2"
                  fontWeight={isSel ? "700" : "500"}
                  fill={isSel ? "#ffffff" : "#ffd2e5"}
                  stroke="#0b0408"
                  strokeWidth="2.6"
                  style={{ paintOrder: "stroke" }}
                  className="font-mono-tech"
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </svg>

        {activeNode && (
          <div
            className="font-mono-tech"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: 7,
              background: "rgba(255, 71, 145, 0.13)",
              border: "1px solid rgba(255, 110, 170, 0.3)",
              fontSize: "0.7rem",
              color: "#ffe6f0",
            }}
          >
            <span>
              LEAD <strong>{activeNode.id}</strong> ({activeNode.region})
            </span>
            <span>{activeNode.isPosterior ? "DS-Qi POSTERIOR ROI" : "CORTICAL NODE"}</span>
          </div>
        )}
      </div>

      {/* 7 Graph Topology Readouts */}
      <div className="topo-mini-grid">
        <div className="topo-cell">
          <div className="topo-cell-k font-mono-tech">Char. Path (CPL)</div>
          <div className="topo-cell-v font-mono-tech">
            {topology ? topology.characteristic_path_length.toFixed(4) : "—"}
          </div>
        </div>
        <div className="topo-cell">
          <div className="topo-cell-k font-mono-tech">Global Eff. (GE)</div>
          <div className="topo-cell-v font-mono-tech">
            {topology ? topology.global_efficiency.toFixed(4) : "—"}
          </div>
        </div>
        <div className="topo-cell">
          <div className="topo-cell-k font-mono-tech">Clustering / LE</div>
          <div className="topo-cell-v font-mono-tech">
            {topology ? `${topology.clustering_coefficient.toFixed(3)} / ${topology.local_efficiency.toFixed(3)}` : "—"}
          </div>
        </div>
        <div className="topo-cell">
          <div className="topo-cell-k font-mono-tech">
            PCC / <span style={{ textTransform: "none" }}>β</span>-wPLI
          </div>
          <div className="topo-cell-v font-mono-tech">
            {topology ? `${meanPcc.toFixed(3)} / ${meanWpli.toFixed(3)}` : "—"}
          </div>
        </div>
      </div>
    </section>
  );
};
