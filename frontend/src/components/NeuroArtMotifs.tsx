import React from "react";
import { PhysiologicalState } from "../services/api";

interface CyberBrainProps {
  stateHint: PhysiologicalState;
  lambda2?: number;
  spikeRate?: number;
}

/**
 * Editorial anatomical cyber-brain engraving inspired by the reference
 * blush-pink ink etching + glowing rose MRI telemetry aesthetic.
 */
export const CyberBrainIllustration: React.FC<CyberBrainProps> = ({
  stateHint,
  lambda2 = 0.69,
  spikeRate = 0.37,
}) => {
  const pulseSpeed = stateHint === "ictal" ? "1.1s" : stateHint === "preictal" ? "2.2s" : "3.8s";
  const waveAmplitude = stateHint === "ictal" ? 1.25 : stateHint === "preictal" ? 1.0 : 0.7;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 195,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 520 260"
        width="100%"
        height="100%"
        role="img"
        aria-label="Anatomical cyber-brain etching with EEG contour waves"
        style={{ maxHeight: 225, overflow: "visible" }}
      >
        <defs>
          <radialGradient id="roseOrbGrad" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ff88b8" stopOpacity="0.95" />
            <stop offset="65%" stopColor="#e23d81" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#b51f5e" stopOpacity="0.72" />
          </radialGradient>
          <pattern id="inkStipple" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.8" fill="currentColor" opacity="0.22" />
            <circle cx="4.5" cy="4.5" r="0.6" fill="currentColor" opacity="0.16" />
          </pattern>
        </defs>

        {/* Organic rose splatter & geometric orbs (Image 2 motif) */}
        <circle cx="345" cy="68" r="56" fill="url(#roseOrbGrad)" opacity="0.82" />
        <circle cx="152" cy="182" r="46" fill="url(#roseOrbGrad)" opacity="0.76" />
        <path
          d="M66 138 C52 108, 86 78, 120 92 C142 62, 185 78, 178 112 C205 128, 182 174, 134 166 C98 182, 74 162, 66 138 Z"
          fill="#eb5c97"
          opacity="0.34"
        />

        {/* Flowing multi-strand EEG topographic contour ribbons */}
        <g fill="none" stroke="currentColor" strokeWidth="1.05" opacity="0.76">
          {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
            const dy = idx * 5.2 * waveAmplitude;
            return (
              <path
                key={`top-ribbon-${idx}`}
                d={`M 308 ${68 + idx * 3} C 362 ${28 + dy}, 402 ${94 - dy}, 498 ${18 + idx * 7}`}
              />
            );
          })}
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const dy = idx * 4.5 * waveAmplitude;
            return (
              <path
                key={`bot-ribbon-${idx}`}
                d={`M 142 ${168 + idx * 3} C 102 ${198 + dy}, 82 ${224 - dy}, 26 ${252 - idx * 4}`}
              />
            );
          })}
        </g>

        {/* Technical telemetry grid & crosshair ticks */}
        <g stroke="#e23d81" strokeWidth="1" opacity="0.7">
          <line x1="384" y1="150" x2="496" y2="150" />
          <line x1="418" y1="112" x2="418" y2="236" />
          <line x1="458" y1="126" x2="458" y2="228" />
          <line x1="358" y1="205" x2="486" y2="205" />
          <line x1="60" y1="42" x2="188" y2="42" stroke="currentColor" strokeDasharray="3 4" />
          <line x1="88" y1="30" x2="88" y2="112" stroke="currentColor" strokeDasharray="2 3" />
          {[395, 405, 415, 425, 435, 445, 455, 465].map((x) => (
            <line key={x} x1={x} y1="147" x2={x} y2="153" />
          ))}
        </g>

        {/* Anatomical Brain Engraving Silhouette */}
        <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* Brainstem & Cerebellum */}
          <path
            d="M 278 188 C 282 214, 294 236, 307 244 C 314 236, 314 214, 309 194 Z"
            fill="var(--bg-surface)"
            strokeWidth="1.8"
          />
          <path
            d="M 255 168 C 254 192, 276 212, 316 206 C 344 202, 360 182, 355 162 C 330 164, 288 164, 255 168 Z"
            fill="var(--bg-surface)"
            strokeWidth="1.8"
          />
          {/* Cerebellar foliation lines */}
          <path d="M 262 178 Q 305 184 350 172" fill="none" strokeWidth="0.9" />
          <path d="M 266 187 Q 306 194 348 182" fill="none" strokeWidth="0.9" />
          <path d="M 274 195 Q 306 201 340 191" fill="none" strokeWidth="0.9" />

          {/* Main Cerebral Cortex */}
          <path
            d="M 122 142
               C 104 134, 102 104, 120 82
               C 138 56, 178 40, 226 36
               C 278 32, 336 46, 372 78
               C 402 106, 406 150, 384 170
               C 362 186, 324 182, 290 176
               C 256 172, 214 182, 180 172
               C 150 164, 134 152, 122 142 Z"
            fill="var(--bg-surface)"
            strokeWidth="2.1"
          />

          {/* Cortical shading stipple */}
          <path
            d="M 132 134 C 122 102, 152 60, 218 46 C 276 38, 336 52, 366 84 C 332 76, 266 78, 216 102 C 180 120, 156 138, 132 134 Z"
            fill="url(#inkStipple)"
            stroke="none"
          />

          {/* Gyri & Sulci Engraving Lines */}
          <g fill="none" strokeWidth="1.4">
            <path d="M 132 106 C 154 92, 176 96, 186 112 C 194 124, 182 142, 166 136" />
            <path d="M 152 74 C 176 64, 206 72, 214 92 C 220 106, 204 116, 194 106" />
            <path d="M 196 52 C 228 46, 248 64, 242 88 C 238 104, 258 112, 268 96" />
            <path d="M 248 44 C 276 46, 296 66, 286 92 C 280 108, 298 116, 314 102" />
            <path d="M 294 54 C 324 58, 344 78, 336 102" />
            <path d="M 142 132 C 168 148, 202 152, 232 136 C 254 124, 274 134, 290 148" />
          </g>

          {/* Neuromorphic Mechanical / Spiking Circuit Core inside Cortex */}
          <g fill="none" strokeWidth="1.2">
            {/* Anterior Synaptic Focal Ring */}
            <circle cx="198" cy="116" r="22" stroke="currentColor" strokeDasharray="3 2" />
            <circle cx="198" cy="116" r="13" fill="#ff4791" stroke="currentColor" strokeWidth="1.4">
              <animate
                attributeName="r"
                values="11;14.5;11"
                dur={pulseSpeed}
                repeatCount="indefinite"
              />
            </circle>

            {/* Posterior Conformer / Graph Hub */}
            <circle cx="328" cy="126" r="28" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="328" cy="126" r="24" stroke="currentColor" strokeWidth="4.2" strokeDasharray="1.8 4.2" opacity="0.65" />
            <circle cx="328" cy="126" r="19" stroke="#e23d81" strokeDasharray="4 3" />
            <circle cx="328" cy="126" r="9.5" fill="#ff74ad" stroke="currentColor" />

            {/* Synaptic Interconnect Bus */}
            <path d="M 216 120 L 254 120 L 270 134 L 300 134" strokeWidth="1.6" />
            <path d="M 212 130 L 244 146 L 296 146 L 310 136" stroke="#e23d81" strokeWidth="1.3" />
            <path d="M 250 104 L 284 104 L 306 118" strokeWidth="1.1" />
            <circle cx="254" cy="120" r="3" fill="currentColor" />
            <circle cx="270" cy="134" r="3.5" fill="#ff4791" />
            <circle cx="244" cy="146" r="2.8" fill="currentColor" />
            <circle cx="284" cy="104" r="2.5" fill="#ff4791" />
          </g>
        </g>

        {/* Calibration Dots & Clinical Coordinates */}
        <g className="font-mono-tech" fontSize="9.2" fill="currentColor">
          <circle cx="102" cy="70" r="4.5" fill="currentColor" />
          <circle cx="436" cy="186" r="4.2" fill="#e23d81" />
          <circle cx="458" cy="150" r="3.2" fill="currentColor" />
          <circle cx="298" cy="24" r="4.2" fill="currentColor" />
          <text x="392" y="246" opacity="0.82">
            λ2 {lambda2.toFixed(2)} // SPK {(spikeRate * 100).toFixed(2)}%
          </text>
          <text x="64" y="34" opacity="0.7">
            CORTICAL ENGRAVING // CHB-MIT
          </text>
        </g>
      </svg>
    </div>
  );
};

export const BrandEmblem: React.FC = () => (
  <svg width="42" height="42" viewBox="0 0 44 44" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="40" height="40" rx="10" fill="var(--bg-surface-tint)" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="30" cy="14" r="8" fill="#e23d81" opacity="0.35" />
    <path
      d="M11 24C10 18 14 12 21 11C28 10 34 15 34 22C34 27 30 30 25 29C22 29 19 31 16 29C13 28 11 26 11 24Z"
      stroke="currentColor"
      strokeWidth="1.6"
      fill="var(--bg-surface)"
    />
    <path d="M15 19C18 16 22 17 22 21M24 16C27 16 30 19 29 23" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="27" cy="22" r="3" fill="#ff4791" stroke="currentColor" strokeWidth="1.1" />
    <path d="M6 24H10M34 22H38" stroke="#e23d81" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
