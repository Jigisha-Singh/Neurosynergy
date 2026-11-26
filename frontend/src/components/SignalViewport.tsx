import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnalysisRequest, AnalysisResponse } from "../services/api";
import { generateEEGDisplayTraces } from "../services/localSimulation";

type ViewportMode = "traces" | "cwt" | "fooof";

interface SignalViewportProps {
  request: AnalysisRequest;
  analysis: AnalysisResponse | null;
}

export const SignalViewport: React.FC<SignalViewportProps> = ({ request, analysis }) => {
  const [mode, setMode] = useState<ViewportMode>("traces");
  const [gain, setGain] = useState<number>(1.0);
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  const [hoverTimeSec, setHoverTimeSec] = useState<number | null>(null);
  const cwtCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const series = useMemo(() => generateEEGDisplayTraces(request, 8, 300), [request]);
  const cwtBounds = analysis?.explainability.cwt_norm_bounds ?? [0.0, 2.41];
  const peakHz = analysis?.explainability.periodic_peak_hz ?? (request.state_hint === "ictal" ? 14.5 : request.state_hint === "preictal" ? 6.0 : 10.0);
  const aperiodicExp = analysis?.explainability.aperiodic_exponent ?? (request.state_hint === "ictal" ? 1.21 : 1.52);

  // Render CWT Morlet Scalogram onto Canvas using Image 1's obsidian -> hot rose -> white colormap
  useEffect(() => {
    if (mode !== "cwt") return;
    const canvas = cwtCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const img = ctx.createImageData(w, h);
    const data = img.data;

    const cMin = cwtBounds[0] ?? 0;
    const cMax = cwtBounds[1] ?? 2.41;

    for (let py = 0; py < h; py++) {
      // Frequency axis: top = 40 Hz, bottom = 0.5 Hz
      const fracY = 1 - py / (h - 1);
      const freq = 0.5 + fracY * 39.5;

      for (let px = 0; px < w; px++) {
        const t = (px / (w - 1)) * series.durationSec;

        // 1/f background energy + state-specific Morlet ridge profiles
        let mag = 0.42 * Math.pow(Math.max(freq, 0.8), -0.38);

        if (request.state_hint === "interictal") {
          mag += 1.28 * Math.exp(-Math.pow((freq - 10.0) / 2.2, 2)) * (0.85 + 0.15 * Math.sin(t * 2.1));
          mag += 0.35 * Math.exp(-Math.pow((freq - 4.5) / 2.6, 2));
        } else if (request.state_hint === "preictal") {
          mag += 1.48 * Math.exp(-Math.pow((freq - 6.0) / 2.1, 2)) * (0.78 + 0.25 * Math.sin(t * 1.6));
          mag += 1.15 * Math.exp(-Math.pow((freq - 19.0) / 3.2, 2)) * (0.65 + 0.35 * (t / series.durationSec));
        } else {
          const burst = 0.72 + 0.45 * Math.sin(2 * Math.PI * 0.65 * t);
          mag += 2.05 * burst * Math.exp(-Math.pow((freq - 14.5) / 2.8, 2));
          mag += 1.65 * burst * Math.exp(-Math.pow((freq - 24.0) / 3.8, 2));
          mag += 0.95 * Math.exp(-Math.pow((freq - 3.0) / 1.8, 2));
        }

        // Subtle wavelet texture ripples
        mag += 0.14 * Math.sin(freq * 0.8 + t * 4.5 + request.seed * 0.1);

        // Clip to global 5th-95th CWT bounds [0.000, 2.410]
        const clipped = Math.min(cMax, Math.max(cMin, mag));
        const norm = (clipped - cMin) / Math.max(cMax - cMin, 1e-5);

        // Radiographic MRI Rose colormap: black -> wine -> magenta-rose -> bone-white
        let r = 0;
        let g = 0;
        let b = 0;
        if (norm < 0.35) {
          const k = norm / 0.35;
          r = Math.round(12 + k * 145);
          g = Math.round(5 + k * 18);
          b = Math.round(10 + k * 75);
        } else if (norm < 0.75) {
          const k = (norm - 0.35) / 0.4;
          r = Math.round(157 + k * 95);
          g = Math.round(23 + k * 68);
          b = Math.round(85 + k * 82);
        } else {
          const k = (norm - 0.75) / 0.25;
          r = Math.round(252 + k * 3);
          g = Math.round(91 + k * 155);
          b = Math.round(167 + k * 83);
        }

        const idx = (py * w + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  }, [mode, request.state_hint, request.seed, series.durationSec, cwtBounds]);

  // FOOOF PSD curve points (0.5 - 40 Hz)
  const fooofData = useMemo(() => {
    const freqs: number[] = [];
    const aperiodic: number[] = [];
    const total: number[] = [];
    for (let f = 1; f <= 40; f += 0.5) {
      freqs.push(f);
      const ap = 2.6 - aperiodicExp * Math.log10(f);
      const bw = request.state_hint === "ictal" ? 3.2 : 2.1;
      const peakAmp = request.state_hint === "ictal" ? 1.25 : request.state_hint === "preictal" ? 0.96 : 0.88;
      const secondary = request.state_hint === "preictal" ? 0.55 * Math.exp(-Math.pow((f - 19.0) / 3.0, 2)) : request.state_hint === "ictal" ? 0.72 * Math.exp(-Math.pow((f - 24.0) / 3.6, 2)) : 0;
      const osc = peakAmp * Math.exp(-Math.pow((f - peakHz) / bw, 2)) + secondary;
      aperiodic.push(ap);
      total.push(ap + osc);
    }
    return { freqs, aperiodic, total };
  }, [aperiodicExp, peakHz, request.state_hint]);

  const svgWidth = 760;
  const svgHeight = 310;
  const padLeft = 72;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 28;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  return (
    <section className="mri-chamber">
      <div className="mri-header">
        <div>
          <h2 className="mri-title">
            <span>STUDY 1 // RADIOGRAPHIC SIGNAL SCOPE</span>
            <span className="mri-meta-code font-mono-tech">
              {request.subject_code.toUpperCase()} · {request.num_channels}CH · {request.samples_per_channel} SMP ({series.durationSec.toFixed(1)}S)
            </span>
          </h2>
          <div className="mri-meta-code font-mono-tech" style={{ marginTop: 3, opacity: 0.85 }}>
            BP {analysis?.preprocessing_summary.bandpass_hz ?? "0.5-40.0"} HZ · NOTCH {analysis?.preprocessing_summary.notch_hz ?? 60} HZ · STRIDE {analysis?.preprocessing_summary.stride_samples_used ?? (request.state_hint === "ictal" ? 51 : 640)} · MF 1.12 · RAH
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {mode === "traces" && (
            <button
              type="button"
              onClick={() => setGain((g) => (g === 1 ? 1.6 : g === 1.6 ? 0.7 : 1))}
              className="mri-tab font-mono-tech"
              style={{ border: "1px solid rgba(255,140,190,0.3)", color: "#ffd5e6" }}
              title="Adjust trace amplitude gain"
            >
              GAIN {gain.toFixed(1)}x
            </button>
          )}
          <div className="mri-tabs" role="tablist" aria-label="Signal inspection modes">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "traces"}
              className={`mri-tab font-mono-tech ${mode === "traces" ? "active" : ""}`}
              onClick={() => setMode("traces")}
            >
              EEG TRACES
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "cwt"}
              className={`mri-tab font-mono-tech ${mode === "cwt" ? "active" : ""}`}
              onClick={() => setMode("cwt")}
            >
              CWT SCALOGRAM
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "fooof"}
              className={`mri-tab font-mono-tech ${mode === "fooof" ? "active" : ""}`}
              onClick={() => setMode("fooof")}
            >
              FOOOF PSD
            </button>
          </div>
        </div>
      </div>

      {mode === "traces" && (
        <div style={{ position: "relative" }}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            width="100%"
            style={{ display: "block", cursor: "crosshair" }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = ((e.clientX - rect.left) / rect.width) * svgWidth;
              if (relX >= padLeft && relX <= svgWidth - padRight) {
                const frac = (relX - padLeft) / plotW;
                setHoverTimeSec(frac * series.durationSec);
              } else {
                setHoverTimeSec(null);
              }
            }}
            onMouseLeave={() => setHoverTimeSec(null)}
          >
            {/* Vertical clinical time grid & tick ruler */}
            {[0, 1, 2, 3, 4, 5].map((sec) => {
              const x = padLeft + (sec / 5) * plotW;
              return (
                <g key={sec}>
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={svgHeight - padBottom}
                    stroke="rgba(255, 145, 194, 0.14)"
                    strokeDasharray={sec === 0 || sec === 5 ? undefined : "2 4"}
                  />
                  <line x1={x} y1={svgHeight - padBottom} x2={x} y2={svgHeight - padBottom + 5} stroke="#ff8dbd" />
                  <text
                    x={x}
                    y={svgHeight - 8}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#ff9dc6"
                    className="font-mono-tech"
                  >
                    {((sec / 5) * series.durationSec).toFixed(1)}s
                  </text>
                </g>
              );
            })}

            {/* Left MRI vertical calibration scale bar */}
            <line x1={padLeft - 8} y1={padTop} x2={padLeft - 8} y2={svgHeight - padBottom} stroke="#ff4791" strokeWidth="1" opacity="0.7" />
            {Array.from({ length: 17 }).map((_, idx) => {
              const y = padTop + (idx / 16) * plotH;
              return (
                <line
                  key={idx}
                  x1={padLeft - 8}
                  y1={y}
                  x2={padLeft - (idx % 4 === 0 ? 14 : 11)}
                  y2={y}
                  stroke="#ff8dbd"
                  strokeWidth="0.9"
                  opacity="0.7"
                />
              );
            })}

            {/* Multi-channel EEG traces */}
            {series.signals.map((chData, chIdx) => {
              const rowH = plotH / series.signals.length;
              const centerY = padTop + (chIdx + 0.5) * rowH;
              const isPosterior = chIdx < 4;
              const isSelected = selectedChannel === chIdx;
              const dimmed = selectedChannel !== null && !isSelected;

              const pathD = chData
                .map((sample, idx) => {
                  const x = padLeft + (idx / Math.max(chData.length - 1, 1)) * plotW;
                  const y = centerY - sample * gain * (rowH * 0.31);
                  return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(" ");

              const strokeColor = isSelected
                ? "#ffffff"
                : isPosterior
                ? "#ff4791"
                : "#ffb0d2";

              return (
                <g
                  key={series.channelLabels[chIdx]}
                  style={{ cursor: "pointer", opacity: dimmed ? 0.3 : 1, transition: "opacity 0.15s ease" }}
                  onClick={() => setSelectedChannel(isSelected ? null : chIdx)}
                >
                  <line
                    x1={padLeft}
                    y1={centerY}
                    x2={svgWidth - padRight}
                    y2={centerY}
                    stroke="rgba(255, 160, 200, 0.08)"
                  />
                  <text
                    x={padLeft - 18}
                    y={centerY + 3}
                    textAnchor="end"
                    fontSize="9.5"
                    fill={isPosterior ? "#ff6ca8" : "#f2cde0"}
                    fontWeight={isSelected ? "700" : "500"}
                    className="font-mono-tech"
                  >
                    {series.channelLabels[chIdx]}
                  </text>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 1.85 : isPosterior ? 1.4 : 1.1}
                  />
                </g>
              );
            })}

            {/* Hover scrub cursor */}
            {hoverTimeSec !== null && (
              <g pointerEvents="none">
                <line
                  x1={padLeft + (hoverTimeSec / series.durationSec) * plotW}
                  y1={padTop}
                  x2={padLeft + (hoverTimeSec / series.durationSec) * plotW}
                  y2={svgHeight - padBottom}
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <rect
                  x={Math.min(svgWidth - 96, padLeft + (hoverTimeSec / series.durationSec) * plotW + 6)}
                  y={padTop + 2}
                  width="82"
                  height="18"
                  rx="4"
                  fill="#ff4791"
                />
                <text
                  x={Math.min(svgWidth - 96, padLeft + (hoverTimeSec / series.durationSec) * plotW + 47)}
                  y={padTop + 14}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="700"
                  fill="#0b0408"
                  className="font-mono-tech"
                >
                  t = {hoverTimeSec.toFixed(2)}s
                </text>
              </g>
            )}
          </svg>

          <div
            className="font-mono-tech"
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              fontSize: "0.68rem",
              color: "#d9a2bb",
              marginTop: 4,
            }}
          >
            <span>
              <span style={{ color: "#ff4791" }}>■</span> POSTERIOR DS-Qi CHANNELS (θ/α) &nbsp;·&nbsp;
              <span style={{ color: "#ffb0d2" }}>■</span> CORTICAL LEADS (CLICK LEAD TO ISOLATE)
            </span>
            <span>TI 1900.0 · TR 8210.0 · Z-SCORED μ=0, σ=1</span>
          </div>
        </div>
      )}

      {mode === "cwt" && (
        <div>
          <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,140,190,0.28)" }}>
            <canvas
              ref={cwtCanvasRef}
              width={640}
              height={236}
              style={{ width: "100%", height: 245, display: "block" }}
            />
            <div
              className="font-mono-tech"
              style={{
                position: "absolute",
                top: 8,
                left: 10,
                fontSize: "0.66rem",
                background: "rgba(9, 4, 7, 0.78)",
                padding: "3px 8px",
                borderRadius: 5,
                border: "1px solid rgba(255, 110, 170, 0.35)",
                color: "#ffe4ef",
              }}
            >
              127 MORLET SCALES · 40.0 HZ → 0.5 HZ · GLOBAL CLIP [{cwtBounds[0].toFixed(3)}, {cwtBounds[1].toFixed(3)}]
            </div>
            <div
              className="font-mono-tech"
              style={{
                position: "absolute",
                bottom: 8,
                right: 10,
                fontSize: "0.66rem",
                background: "rgba(9, 4, 7, 0.78)",
                padding: "3px 8px",
                borderRadius: 5,
                color: "#ff9dc6",
              }}
            >
              PEAK RIDGE: {peakHz.toFixed(1)} HZ ({request.state_hint.toUpperCase()})
            </div>
          </div>
          <div
            className="font-mono-tech"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 8,
              fontSize: "0.68rem",
              color: "#d9a2bb",
            }}
          >
            <span>TIME: 0.0s → {series.durationSec.toFixed(1)}s</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>{cwtBounds[0].toFixed(3)}</span>
              <span
                style={{
                  width: 120,
                  height: 8,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #0d0509, #9d1755, #ff4791, #fff6fa)",
                  display: "inline-block",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              />
              <span>{cwtBounds[1].toFixed(3)}</span>
            </div>
          </div>
        </div>
      )}

      {mode === "fooof" && (
        <div>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight - 30}`} width="100%" style={{ display: "block" }}>
            {(() => {
              const h = svgHeight - 30;
              const pH = h - padTop - padBottom;
              const minY = -0.2;
              const maxY = 3.8;
              const toX = (f: number) => padLeft + ((f - 1) / 39) * plotW;
              const toY = (v: number) => padTop + (1 - (v - minY) / (maxY - minY)) * pH;

              const totalD = fooofData.freqs
                .map((f, i) => `${i === 0 ? "M" : "L"}${toX(f).toFixed(1)},${toY(fooofData.total[i]).toFixed(1)}`)
                .join(" ");
              const apD = fooofData.freqs
                .map((f, i) => `${i === 0 ? "M" : "L"}${toX(f).toFixed(1)},${toY(fooofData.aperiodic[i]).toFixed(1)}`)
                .join(" ");

              const areaD = `${totalD} L${toX(40).toFixed(1)},${(padTop + pH).toFixed(1)} L${toX(1).toFixed(1)},${(padTop + pH).toFixed(1)} Z`;

              return (
                <>
                  <defs>
                    <linearGradient id="fooofFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff4791" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#ff4791" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {[4, 8, 12, 20, 30, 40].map((hz) => (
                    <g key={hz}>
                      <line x1={toX(hz)} y1={padTop} x2={toX(hz)} y2={padTop + pH} stroke="rgba(255,145,194,0.14)" />
                      <text x={toX(hz)} y={h - 8} textAnchor="middle" fontSize="9.5" fill="#ff9dc6" className="font-mono-tech">
                        {hz}Hz
                      </text>
                    </g>
                  ))}

                  <path d={areaD} fill="url(#fooofFill)" />
                  <path d={apD} fill="none" stroke="#ffd2e4" strokeWidth="1.4" strokeDasharray="5 4" />
                  <path d={totalD} fill="none" stroke="#ff4791" strokeWidth="2.4" />

                  {/* Peak marker */}
                  <line
                    x1={toX(peakHz)}
                    y1={padTop}
                    x2={toX(peakHz)}
                    y2={padTop + pH}
                    stroke="#ffffff"
                    strokeDasharray="2 3"
                    opacity="0.65"
                  />
                  <circle cx={toX(peakHz)} cy={toY(2.6 - aperiodicExp * Math.log10(Math.max(peakHz, 1)) + (request.state_hint === "ictal" ? 1.25 : 0.92))} r="5" fill="#ffffff" stroke="#ff4791" strokeWidth="2" />
                  <text
                    x={Math.min(svgWidth - 150, toX(peakHz) + 8)}
                    y={padTop + 16}
                    fontSize="10"
                    fontWeight="700"
                    fill="#ffffff"
                    className="font-mono-tech"
                  >
                    PERIODIC PEAK: {peakHz.toFixed(1)} HZ
                  </text>
                </>
              );
            })()}
          </svg>
          <div
            className="font-mono-tech"
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.68rem",
              color: "#d9a2bb",
              marginTop: 4,
            }}
          >
            <span>
              <span style={{ color: "#ff4791" }}>━━</span> FULL FOOOF SPECTRUM &nbsp;·&nbsp;
              <span style={{ color: "#ffd2e4" }}>┄┄</span> 1/f^χ APERIODIC FIT (χ = {aperiodicExp.toFixed(2)})
            </span>
            <span>WELCH NPERSEG=256 · PSD LOG10</span>
          </div>
        </div>
      )}
    </section>
  );
};
