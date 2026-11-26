import React, { useCallback, useEffect, useState } from "react";
import {
  analyzeEEGWindow,
  AnalysisRequest,
  AnalysisResponse,
  BenchmarkCreatePayload,
  BenchmarkRow,
  createBenchmark,
  fetchBenchmarks,
  fetchHealth,
  fetchSubjects,
  HealthStatus,
  PhysiologicalState,
  SubjectRecord,
} from "./services/api";
import {
  FALLBACK_BENCHMARKS,
  FALLBACK_SUBJECTS,
  runLocalFallbackAnalysis,
} from "./services/localSimulation";
import { BrandEmblem, CyberBrainIllustration } from "./components/NeuroArtMotifs";
import { SignalViewport } from "./components/SignalViewport";
import { CorticalConnectome } from "./components/CorticalConnectome";
import { SpikingConformerPanel } from "./components/SpikingConformerPanel";
import { BiomarkerExplainabilityPanel } from "./components/BiomarkerExplainabilityPanel";
import { BenchmarkMatrixView } from "./components/BenchmarkMatrixView";
import { CohortAtlasView, TelemetryHistoryEntry } from "./components/CohortAtlasView";

type ActiveTab = "lab" | "benchmarks" | "cohort";
type PolarityTheme = "paper" | "obsidian";

export default function App() {
  const [theme, setTheme] = useState<PolarityTheme>("paper");
  const [activeTab, setActiveTab] = useState<ActiveTab>("lab");

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);
  const [connectionNote, setConnectionNote] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<SubjectRecord[]>(FALLBACK_SUBJECTS.subjects);
  const [heldOutCohort, setHeldOutCohort] = useState<string[]>(FALLBACK_SUBJECTS.held_out_cohort);
  const [benchmarks, setBenchmarks] = useState<BenchmarkRow[]>(FALLBACK_BENCHMARKS);

  const [subjectCode, setSubjectCode] = useState<string>("chb01");
  const [stateHint, setStateHint] = useState<PhysiologicalState>("preictal");
  const [numChannels, setNumChannels] = useState<number>(22);
  const [samplesPerChannel, setSamplesPerChannel] = useState<number>(1280);
  const [seed, setSeed] = useState<number>(42);

  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<TelemetryHistoryEntry[]>([]);

  const currentRequest: AnalysisRequest = {
    subject_code: subjectCode,
    num_channels: numChannels,
    samples_per_channel: samplesPerChannel,
    state_hint: stateHint,
    seed,
  };

  const appendTelemetry = useCallback((res: AnalysisResponse) => {
    const entry: TelemetryHistoryEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      subject_code: res.subject_code,
      state_hint: res.state_hint,
      predicted_state: res.spiking_conformer.predicted_state,
      confidence: res.spiking_conformer.confidence,
      ds_qi: res.biomarkers.ds_qi,
      sii_composite: res.biomarkers.sii_composite,
      laplacian_lambda_2: res.graph_topology.laplacian_lambda_2,
    };
    setHistory((prev) => [entry, ...prev].slice(0, 20));
  }, []);

  const executePipeline = useCallback(
    async (req: AnalysisRequest, preferLive: boolean) => {
      setLoading(true);
      try {
        if (preferLive) {
          const out = await analyzeEEGWindow(req);
          setAnalysis(out);
          appendTelemetry(out);
          setIsLiveBackend(true);
          setConnectionNote(null);
          return;
        }
        const sim = runLocalFallbackAnalysis(req);
        setAnalysis(sim);
        appendTelemetry(sim);
      } catch {
        const sim = runLocalFallbackAnalysis(req);
        setAnalysis(sim);
        appendTelemetry(sim);
        setIsLiveBackend(false);
        setConnectionNote(
          "FastAPI backend on :8000 is unreachable — displaying deterministic client-side simulation. Start `uvicorn app.main:app --reload --port 8000` for live PyTorch/SciPy inference."
        );
      } finally {
        setLoading(false);
      }
    },
    [appendTelemetry]
  );

  const bootstrapPlatform = useCallback(async () => {
    try {
      const [h, subjRes, benchRes] = await Promise.all([
        fetchHealth(),
        fetchSubjects(),
        fetchBenchmarks(),
      ]);
      setHealth(h);
      setSubjects(subjRes.subjects);
      setHeldOutCohort(subjRes.held_out_cohort);
      setBenchmarks(benchRes);
      setIsLiveBackend(true);
      setConnectionNote(null);
      await executePipeline(
        {
          subject_code: "chb01",
          num_channels: 22,
          samples_per_channel: 1280,
          state_hint: "preictal",
          seed: 42,
        },
        true
      );
    } catch {
      setHealth(null);
      setIsLiveBackend(false);
      setSubjects(FALLBACK_SUBJECTS.subjects);
      setHeldOutCohort(FALLBACK_SUBJECTS.held_out_cohort);
      setBenchmarks(FALLBACK_BENCHMARKS);
      setConnectionNote(
        "FastAPI backend on :8000 is unreachable — running in deterministic preview mode. Start `uvicorn app.main:app --reload --port 8000` for live PyTorch/SciPy inference."
      );
      await executePipeline(
        {
          subject_code: "chb01",
          num_channels: 22,
          samples_per_channel: 1280,
          state_hint: "preictal",
          seed: 42,
        },
        false
      );
    }
  }, [executePipeline]);

  useEffect(() => {
    void bootstrapPlatform();
  }, [bootstrapPlatform]);

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    void executePipeline(currentRequest, true);
  }

  function handleRandomizeSeed() {
    const nextSeed = Math.floor(Math.random() * 9999) + 1;
    setSeed(nextSeed);
    void executePipeline({ ...currentRequest, seed: nextSeed }, isLiveBackend);
  }

  function handleSelectState(nextState: PhysiologicalState) {
    setStateHint(nextState);
    void executePipeline({ ...currentRequest, state_hint: nextState }, isLiveBackend);
  }

  async function handleCreateBenchmark(payload: BenchmarkCreatePayload) {
    if (isLiveBackend) {
      const created = await createBenchmark(payload);
      setBenchmarks((prev) => [...prev, created]);
    } else {
      const nextId = Math.max(0, ...benchmarks.map((b) => b.id)) + 1;
      setBenchmarks((prev) => [...prev, { id: nextId, ...payload }]);
    }
  }

  function handleSelectSubjectForLab(code: string) {
    setSubjectCode(code);
    setActiveTab("lab");
    void executePipeline({ ...currentRequest, subject_code: code }, isLiveBackend);
  }

  const windowSec = (samplesPerChannel / 256).toFixed(1);

  return (
    <div className="neuro-shell" data-theme={theme}>
      <div className="app-container">
        {/* Top Masthead */}
        <header className="masthead">
          <div className="brand-cluster">
            <BrandEmblem />
            <div>
              <h1 className="brand-title font-editorial">
                NeuroGraph <span style={{ color: "var(--rose-500)", fontStyle: "italic" }}>//</span> Seizure Telemetry
              </h1>
              <p className="brand-subtitle font-mono-tech">
                SPIKING CONFORMER · wPLI/PCC GRAPH TOPOLOGY · DS-Qi &amp; SII BIOMARKERS
              </p>
            </div>
          </div>

          <nav className="nav-tabs" aria-label="Workbench Views">
            <button
              type="button"
              className={`nav-tab font-mono-tech ${activeTab === "lab" ? "active" : ""}`}
              onClick={() => setActiveTab("lab")}
            >
              01 // SIGNAL LAB
            </button>
            <button
              type="button"
              className={`nav-tab font-mono-tech ${activeTab === "benchmarks" ? "active" : ""}`}
              onClick={() => setActiveTab("benchmarks")}
            >
              02 // BENCHMARKS
            </button>
            <button
              type="button"
              className={`nav-tab font-mono-tech ${activeTab === "cohort" ? "active" : ""}`}
              onClick={() => setActiveTab("cohort")}
            >
              03 // COHORT &amp; LOG
            </button>
          </nav>

          <div className="masthead-controls">
            <div className="status-beacon font-mono-tech" title={health ? `${health.service} v${health.version}` : "Offline preview"}>
              <span className={`beacon-dot ${isLiveBackend ? "live" : "offline"}`} />
              <span>{isLiveBackend ? `FASTAPI LIVE · v${health?.version ?? "1.0"}` : "OFFLINE SIMULATION"}</span>
            </div>
            <button
              type="button"
              className="polarity-btn font-mono-tech"
              onClick={() => setTheme((t) => (t === "paper" ? "obsidian" : "paper"))}
              title="Toggle between Blush Paper Etching and Dark Obsidian MRI Film polarity"
            >
              <span>{theme === "paper" ? "◐ OBSIDIAN FILM" : "☀ PAPER ETCHING"}</span>
            </button>
          </div>
        </header>

        {connectionNote && (
          <div className="notice-banner">
            <span className="font-mono-tech">{connectionNote}</span>
            <button type="button" className="btn-ghost font-mono-tech" onClick={() => void bootstrapPlatform()}>
              Retry FastAPI :8000
            </button>
          </div>
        )}

        {/* Tab 1: Signal & Spiking Lab */}
        {activeTab === "lab" && (
          <>
            {/* Editorial Cyber-Anatomical Hero Strip */}
            <section className="hero-atlas-strip">
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div className="hero-kicker font-mono-tech">
                  <span>CORTICAL PHASE &amp; NEUROMORPHIC WORKBENCH</span>
                  <span>·</span>
                  <span>STUDY CHB-MIT</span>
                </div>
                <h2 className="hero-headline font-editorial">
                  Automated Epileptic Seizure Detection &amp; Preictal Dynamics
                </h2>
                <p className="hero-copy">
                  Analyze 5-second scalp EEG windows across 0.5–40 Hz Butterworth bandpass &amp; 60 Hz notch conditioning.
                  Inspect β-band weighted Phase Lag Index (wPLI) cortical networks, Morlet CWT scalograms, FOOOF aperiodic
                  spectra, and <span className="font-mono-tech">T=8</span> Leaky Integrate-and-Fire spiking attention with{" "}
                  <span className="font-mono-tech">T_th=2</span> activity masking.
                </p>

                <div className="hero-spec-pills font-mono-tech">
                  <span className="spec-pill">
                    FS <strong>256 HZ</strong>
                  </span>
                  <span className="spec-pill">
                    BANDPASS <strong>0.5–40 HZ</strong>
                  </span>
                  <span className="spec-pill">
                    NOTCH <strong>60 HZ</strong>
                  </span>
                  <span className="spec-pill">
                    HELD-OUT <strong>CHB16–22</strong>
                  </span>
                  <span className="spec-pill">
                    CWT CLIP <strong>[0.000, 2.410]</strong>
                  </span>
                </div>
              </div>

              <CyberBrainIllustration
                stateHint={stateHint}
                lambda2={analysis?.graph_topology.laplacian_lambda_2}
                spikeRate={analysis?.spiking_conformer.spike_rate}
              />
            </section>

            {/* Specimen Control Deck */}
            <form className="control-deck" onSubmit={handleFormSubmit}>
              <div className="control-grid">
                <div className="field-group">
                  <label className="field-label font-mono-tech" htmlFor="subject-select">
                    <span>Subject (CHB-MIT)</span>
                    <span style={{ color: "var(--rose-600)" }}>
                      {heldOutCohort.includes(subjectCode) ? "HELD-OUT" : "LOSO POOL"}
                    </span>
                  </label>
                  <select
                    id="subject-select"
                    className="neuro-select font-mono-tech"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                  >
                    {subjects.map((s) => (
                      <option key={s.subject_code} value={s.subject_code}>
                        {s.subject_code.toUpperCase()} ({s.age_years}y {s.sex} · {s.seizure_count} sz)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <span className="field-label font-mono-tech">
                    <span>Physiological Window State</span>
                    <span>
                      {stateHint === "interictal"
                        ? "10 HZ ALPHA"
                        : stateHint === "preictal"
                        ? "6+19 HZ BUILDUP"
                        : "14.5+24 HZ ICTAL"}
                    </span>
                  </span>
                  <div className="state-segmented" role="group" aria-label="Physiological State">
                    {(["interictal", "preictal", "ictal"] as PhysiologicalState[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        data-state={st}
                        className={`state-btn font-mono-tech ${stateHint === st ? "active" : ""}`}
                        onClick={() => handleSelectState(st)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label font-mono-tech" htmlFor="channels-input">
                    Channels
                  </label>
                  <input
                    id="channels-input"
                    type="number"
                    min={4}
                    max={64}
                    className="neuro-input font-mono-tech"
                    value={numChannels}
                    onChange={(e) => setNumChannels(Math.min(64, Math.max(4, Number(e.target.value) || 22)))}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label font-mono-tech" htmlFor="samples-select">
                    <span>Window</span>
                    <span>{windowSec}S</span>
                  </label>
                  <select
                    id="samples-select"
                    className="neuro-select font-mono-tech"
                    value={samplesPerChannel}
                    onChange={(e) => setSamplesPerChannel(Number(e.target.value))}
                  >
                    <option value={512}>512 smp (2.0s)</option>
                    <option value={1280}>1280 smp (5.0s)</option>
                    <option value={2560}>2560 smp (10.0s)</option>
                    <option value={4096}>4096 smp (16.0s)</option>
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label font-mono-tech" htmlFor="seed-input">
                    Seed
                  </label>
                  <div className="seed-wrap">
                    <input
                      id="seed-input"
                      type="number"
                      min={0}
                      max={100000}
                      className="neuro-input font-mono-tech"
                      value={seed}
                      onChange={(e) => setSeed(Math.min(100000, Math.max(0, Number(e.target.value) || 0)))}
                    />
                    <button
                      type="button"
                      className="dice-btn font-mono-tech"
                      onClick={handleRandomizeSeed}
                      title="Randomize seed and re-run"
                    >
                      ↻
                    </button>
                  </div>
                </div>

                <button type="submit" className="run-cta font-mono-tech" disabled={loading}>
                  {loading ? "PROCESSING..." : `RUN ${windowSec}S PIPELINE`}
                </button>
              </div>
            </form>

            {/* Primary Radiographic KPI Strip */}
            <section className="metric-strip">
              <div className="kpi-tile">
                <div className="kpi-label font-mono-tech">Conformer State</div>
                <div className="kpi-value font-mono-tech" style={{ textTransform: "uppercase", color: "var(--rose-600)" }}>
                  {analysis?.spiking_conformer.predicted_state ?? "—"}
                </div>
                <div className="kpi-sub font-mono-tech">
                  Confidence {analysis ? `${(analysis.spiking_conformer.confidence * 100).toFixed(1)}%` : "—"} · Spike{" "}
                  {analysis ? `${(analysis.spiking_conformer.spike_rate * 100).toFixed(2)}%` : "—"}
                </div>
              </div>

              <div className="kpi-tile">
                <div className="kpi-label font-mono-tech">
                  Algebraic Connectivity <span style={{ textTransform: "none" }}>λ₂</span>
                </div>
                <div className="kpi-value font-mono-tech">
                  {analysis ? analysis.graph_topology.laplacian_lambda_2.toFixed(4) : "—"}
                </div>
                <div className="kpi-sub font-mono-tech">
                  Global Eff {analysis ? analysis.graph_topology.global_efficiency.toFixed(4) : "—"} · CPL{" "}
                  {analysis ? analysis.graph_topology.characteristic_path_length.toFixed(2) : "—"}
                </div>
              </div>

              <div className="kpi-tile">
                <div className="kpi-label font-mono-tech">
                  <span style={{ textTransform: "none" }}>DS-Qi</span> Biomarker
                </div>
                <div className="kpi-value font-mono-tech">
                  {analysis ? analysis.biomarkers.ds_qi.toFixed(4) : "—"}
                </div>
                <div className="kpi-sub font-mono-tech">
                  θ/α {analysis ? analysis.biomarkers.posterior_theta_alpha.toFixed(3) : "—"} · β-wPLI{" "}
                  {analysis ? analysis.biomarkers.mean_wpli_beta.toFixed(3) : "—"}
                </div>
              </div>

              <div className="kpi-tile">
                <div className="kpi-label font-mono-tech">SII Composite</div>
                <div className="kpi-value font-mono-tech">
                  {analysis ? analysis.biomarkers.sii_composite.toFixed(2) : "—"}
                </div>
                <div className="kpi-sub font-mono-tech">
                  FOOOF Peak {analysis ? `${analysis.explainability.periodic_peak_hz.toFixed(1)} Hz` : "—"} · χ{" "}
                  {analysis ? analysis.explainability.aperiodic_exponent.toFixed(2) : "—"}
                </div>
              </div>
            </section>

            {/* Obsidian Radiographic Viewports (Signal Oscilloscope/CWT/FOOOF + Axial MRI Connectome) */}
            <div className="lab-top-grid">
              <SignalViewport request={currentRequest} analysis={analysis} />
              <CorticalConnectome
                topology={analysis?.graph_topology}
                stateHint={stateHint}
                seed={seed}
              />
            </div>

            {/* Bottom Ink-Paper Panels (Spiking Conformer Raster + Biomarkers & SHAP) */}
            <div className="lab-bottom-grid">
              <SpikingConformerPanel conformer={analysis?.spiking_conformer} seed={seed} />
              <BiomarkerExplainabilityPanel
                biomarkers={analysis?.biomarkers}
                explainability={analysis?.explainability}
              />
            </div>
          </>
        )}

        {/* Tab 2: Five-Pathway Benchmark Matrix */}
        {activeTab === "benchmarks" && (
          <BenchmarkMatrixView
            benchmarks={benchmarks}
            isLiveBackend={isLiveBackend}
            onCreateBenchmark={handleCreateBenchmark}
          />
        )}

        {/* Tab 3: Cohort Atlas & Telemetry History */}
        {activeTab === "cohort" && (
          <CohortAtlasView
            subjects={subjects}
            heldOutCohort={heldOutCohort}
            activeSubject={subjectCode}
            history={history}
            latestAnalysis={analysis}
            onSelectSubjectForLab={handleSelectSubjectForLab}
          />
        )}
      </div>
    </div>
  );
}
