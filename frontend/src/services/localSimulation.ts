import {
  AnalysisRequest,
  AnalysisResponse,
  BenchmarkRow,
  PhysiologicalState,
  SubjectsResponse,
} from "./api";

/**
 * Deterministic Mulberry32 PRNG keyed by the user's analysis seed so waveform,
 * CWT scalogram, and offline preview outputs remain reproducible.
 */
export function createSeededRng(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boxMullerNoise(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-7);
  const u2 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

export const CHB_MIT_MONTAGE = [
  "Fp1-F7",
  "F7-T7",
  "T7-P7",
  "P7-O1",
  "Fp1-F3",
  "F3-C3",
  "C3-P3",
  "P3-O1",
  "Fp2-F4",
  "F4-C4",
  "C4-P4",
  "P4-O2",
  "Fp2-F8",
  "F8-T8",
  "T8-P8",
  "P8-O2",
  "Fz-Cz",
  "Cz-Pz",
  "P7-T7",
  "T7-FT9",
  "FT9-FT10",
  "FT10-T8",
] as const;

export interface EEGDisplaySeries {
  channelLabels: string[];
  signals: number[][]; // shape: [visibleChannels][points]
  durationSec: number;
  samplingRateHz: number;
}

/**
 * Generates clean z-scored multi-channel EEG traces matching the backend
 * synthesize_eeg_window frequency architecture (10 Hz alpha interictal,
 * 6+19 Hz rhythmic preictal, 14.5+24 Hz spike-wave ictal).
 */
export function generateEEGDisplayTraces(
  req: AnalysisRequest,
  displayChannelCount = 8,
  displaySamples = 320
): EEGDisplaySeries {
  const rng = createSeededRng(req.seed + req.num_channels * 17 + req.samples_per_channel);
  const fs = 256;
  const durationSec = req.samples_per_channel / fs;
  const count = Math.min(displayChannelCount, req.num_channels);
  const signals: number[][] = [];
  const channelLabels: string[] = [];

  for (let ch = 0; ch < count; ch++) {
    const label = CHB_MIT_MONTAGE[ch % CHB_MIT_MONTAGE.length];
    channelLabels.push(ch < CHB_MIT_MONTAGE.length ? label : `CH-${ch + 1}`);

    const phaseOffset = ch * 0.42 + (rng() - 0.5) * 0.25;
    const isPosterior = ch < 4 || label.includes("O1") || label.includes("O2") || label.includes("Pz");
    const raw: number[] = [];

    for (let i = 0; i < displaySamples; i++) {
      const t = (i / Math.max(displaySamples - 1, 1)) * durationSec;
      let val = boxMullerNoise(rng) * 0.55;

      if (req.state_hint === "preictal") {
        const thetaBoost = isPosterior ? 1.15 : 0.85;
        val +=
          thetaBoost * 0.95 * Math.sin(2 * Math.PI * 6.0 * t + phaseOffset) +
          0.55 * Math.sin(2 * Math.PI * 19.0 * t + phaseOffset * 0.6) +
          0.25 * Math.sin(2 * Math.PI * 2.2 * t);
      } else if (req.state_hint === "ictal") {
        const burstEnv = 0.72 + 0.48 * Math.sin(2 * Math.PI * 0.65 * t + ch * 0.2);
        const harmonic =
          1.45 * Math.sin(2 * Math.PI * 14.5 * t + phaseOffset) +
          0.88 * Math.sin(2 * Math.PI * 24.0 * t + phaseOffset * 1.3) +
          0.42 * Math.sin(2 * Math.PI * 3.1 * t);
        val += burstEnv * harmonic;
      } else {
        const alphaAmp = isPosterior ? 1.05 : 0.7;
        val +=
          alphaAmp * Math.sin(2 * Math.PI * 10.0 * t + phaseOffset) +
          0.22 * Math.sin(2 * Math.PI * 4.5 * t);
      }
      raw.push(val);
    }

    const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
    const variance = raw.reduce((a, b) => a + (b - mean) ** 2, 0) / raw.length;
    const std = Math.sqrt(variance) || 1;
    signals.push(raw.map((v) => (v - mean) / std));
  }

  return {
    channelLabels,
    signals,
    durationSec,
    samplingRateHz: fs,
  };
}

export const FALLBACK_SUBJECTS: SubjectsResponse = {
  held_out_cohort: ["chb16", "chb17", "chb18", "chb19", "chb20", "chb21", "chb22"],
  subjects: [
    { subject_code: "chb01", cohort_group: "LOSO_POOL", age_years: 11.0, sex: "F", seizure_count: 7 },
    { subject_code: "chb02", cohort_group: "LOSO_POOL", age_years: 11.0, sex: "M", seizure_count: 3 },
    { subject_code: "chb03", cohort_group: "LOSO_POOL", age_years: 14.0, sex: "F", seizure_count: 7 },
    { subject_code: "chb16", cohort_group: "HELD_OUT_CHB16_22", age_years: 7.0, sex: "F", seizure_count: 10 },
    { subject_code: "chb17", cohort_group: "HELD_OUT_CHB16_22", age_years: 12.0, sex: "M", seizure_count: 3 },
    { subject_code: "chb18", cohort_group: "HELD_OUT_CHB16_22", age_years: 18.0, sex: "F", seizure_count: 6 },
    { subject_code: "chb19", cohort_group: "HELD_OUT_CHB16_22", age_years: 19.0, sex: "F", seizure_count: 3 },
    { subject_code: "chb20", cohort_group: "HELD_OUT_CHB16_22", age_years: 6.0, sex: "F", seizure_count: 8 },
    { subject_code: "chb21", cohort_group: "HELD_OUT_CHB16_22", age_years: 13.0, sex: "F", seizure_count: 4 },
    { subject_code: "chb22", cohort_group: "HELD_OUT_CHB16_22", age_years: 9.0, sex: "F", seizure_count: 3 },
  ],
};

export const FALLBACK_BENCHMARKS: BenchmarkRow[] = [
  {
    id: 1,
    pathway_code: "spiking_conformer",
    pathway_name: "1. Neuromorphic Spiking Conformer",
    validation_protocol: "LOSO",
    held_out_subject: "chb16",
    accuracy: 0.971,
    sensitivity: 0.949,
    specificity: 0.993,
    roc_auc: 0.984,
    pr_auc: 0.972,
    compute_ops_ratio: 0.1,
    spike_active_ratio: 0.62,
    notes: "T=8 LIF neurons, 1x25 temporal + 22x1 spatial conv, Softmax-Free SSA, T_th=2 masking",
  },
  {
    id: 2,
    pathway_code: "st_gnn",
    pathway_name: "2. Spatial-Temporal GNN (TBL-PDBNet / NeuroGraph-DSF)",
    validation_protocol: "LOPO",
    held_out_subject: "chb17",
    accuracy: 0.9808,
    sensitivity: 0.9797,
    specificity: 0.9819,
    roc_auc: 0.9992,
    pr_auc: 0.996,
    compute_ops_ratio: 0.85,
    spike_active_ratio: null,
    notes: "Dynamic wPLI + PCC graphs, CPL/GE/CC/LE topology, parallel BiLSTM + Transformer",
  },
  {
    id: 3,
    pathway_code: "multidomain_ml",
    pathway_name: "3. 924D Multi-Domain Ensemble (XGBoost/LightGBM)",
    validation_protocol: "LOSO",
    held_out_subject: "chb18",
    accuracy: 0.884,
    sensitivity: 0.852,
    specificity: 0.916,
    roc_auc: 0.796,
    pr_auc: 0.774,
    compute_ops_ratio: 0.25,
    spike_active_ratio: null,
    notes: "42 features/ch x 22 ch; peak-to-peak amplitude & alpha/beta ratio key cross-patient drivers",
  },
  {
    id: 4,
    pathway_code: "cwt_scalogram",
    pathway_name: "4. 3-Class CWT Morlet Scalogram (5th-95th Clip)",
    validation_protocol: "HELD_OUT_CHB16_22",
    held_out_subject: "chb19",
    accuracy: 0.946,
    sensitivity: 0.928,
    specificity: 0.961,
    roc_auc: 0.965,
    pr_auc: 0.951,
    compute_ops_ratio: 0.7,
    spike_active_ratio: null,
    notes: "127 Morlet scales, 224x224 RGB, global clipping [0.000, 2.410], ictal beta/gamma shift",
  },
  {
    id: 5,
    pathway_code: "biomarker_indices",
    pathway_name: "5. Compact Clinical Biomarkers (DS-Qi & SII)",
    validation_protocol: "LOSO",
    held_out_subject: "chb20",
    accuracy: 0.865,
    sensitivity: 0.86,
    specificity: 0.83,
    roc_auc: 0.9,
    pr_auc: 0.882,
    compute_ops_ratio: 0.02,
    spike_active_ratio: null,
    notes: "Posterior theta/alpha + (1 - wPLI_beta) DS-Qi and delta/line-length/log-var SII",
  },
];

export function runLocalFallbackAnalysis(req: AnalysisRequest): AnalysisResponse {
  const rng = createSeededRng(req.seed + req.subject_code.charCodeAt(req.subject_code.length - 1) * 13);
  const jitter = () => (rng() - 0.5) * 0.06;

  const presets: Record<
    PhysiologicalState,
    {
      confidence: number;
      spikeRate: number;
      activeRatio: number;
      lambda2: number;
      cpl: number;
      ge: number;
      cc: number;
      pcc: number;
      wpli: number;
      thetaAlpha: number;
      pDelta: number;
      lineLen: number;
      logVar: number;
      aperiodic: number;
      peakHz: number;
    }
  > = {
    interictal: {
      confidence: 0.912,
      spikeRate: 0.241,
      activeRatio: 0.448,
      lambda2: 0.428,
      cpl: 3.12,
      ge: 0.364,
      cc: 0.294,
      pcc: 0.212,
      wpli: 0.184,
      thetaAlpha: 0.42,
      pDelta: 0.098,
      lineLen: 412.5,
      logVar: -0.02,
      aperiodic: 1.52,
      peakHz: 10.0,
    },
    preictal: {
      confidence: 0.874,
      spikeRate: 0.368,
      activeRatio: 0.585,
      lambda2: 0.692,
      cpl: 2.34,
      ge: 0.482,
      cc: 0.431,
      pcc: 0.391,
      wpli: 0.336,
      thetaAlpha: 0.915,
      pDelta: 0.154,
      lineLen: 586.2,
      logVar: -0.01,
      aperiodic: 1.52,
      peakHz: 6.0,
    },
    ictal: {
      confidence: 0.964,
      spikeRate: 0.542,
      activeRatio: 0.725,
      lambda2: 0.918,
      cpl: 1.62,
      ge: 0.648,
      cc: 0.594,
      pcc: 0.614,
      wpli: 0.521,
      thetaAlpha: 1.42,
      pDelta: 0.284,
      lineLen: 894.1,
      logVar: 0.01,
      aperiodic: 1.21,
      peakHz: 14.5,
    },
  };

  const p = presets[req.state_hint];
  const round4 = (n: number) => Math.round(n * 10000) / 10000;
  const thetaAlpha = Math.max(0.15, p.thetaAlpha + jitter());
  const meanWpli = Math.max(0.05, Math.min(0.95, p.wpli + jitter()));
  const dsQi = thetaAlpha + (1.0 - meanWpli);
  const pDelta = Math.max(0.02, p.pDelta + jitter() * 0.2);
  const lineLen = Math.max(120, p.lineLen * (req.samples_per_channel / 1280) + jitter() * 140);
  const logVar = p.logVar + jitter() * 0.08;

  return {
    subject_code: req.subject_code,
    state_hint: req.state_hint,
    preprocessing_summary: {
      sampling_rate_hz: 256,
      bandpass_hz: "0.5-40.0",
      notch_hz: 60.0,
      stride_samples_used: req.state_hint === "ictal" ? 51 : 640,
    },
    spiking_conformer: {
      predicted_state: req.state_hint,
      confidence: round4(Math.min(0.995, Math.max(0.51, p.confidence + jitter() * 0.4))),
      spike_rate: round4(Math.min(0.95, Math.max(0.05, p.spikeRate + jitter() * 0.4))),
      compute_active_ratio: round4(Math.min(0.98, Math.max(0.15, p.activeRatio + jitter() * 0.4))),
      estimated_ops_reduction_x: 10.0,
    },
    graph_topology: {
      characteristic_path_length: round4(p.cpl + jitter()),
      global_efficiency: round4(p.ge + jitter() * 0.4),
      clustering_coefficient: round4(p.cc + jitter() * 0.4),
      local_efficiency: round4(p.cc + jitter() * 0.4),
      laplacian_lambda_2: round4(p.lambda2 + jitter()),
      mean_pcc_weight: round4(p.pcc + jitter() * 0.4),
      mean_wpli_weight: round4(meanWpli),
    },
    biomarkers: {
      ds_qi: round4(dsQi),
      posterior_theta_alpha: round4(thetaAlpha),
      mean_wpli_beta: round4(meanWpli),
      sii_composite: round4(pDelta + lineLen + logVar),
      p_delta: round4(pDelta),
      line_length: round4(lineLen),
      log_variance: round4(logVar),
    },
    explainability: {
      top_features: [
        { name: "Peak-to-Peak Amplitude (Time)", shap: 0.342 },
        { name: "Posterior Theta/Alpha + Beta wPLI", shap: 0.289 },
        { name: "Alpha/Beta PSD Ratio (Freq)", shap: 0.218 },
        { name: "db4 Wavelet & Perm Entropy", shap: 0.151 },
      ],
      aperiodic_exponent: p.aperiodic,
      periodic_peak_hz: p.peakHz,
      cwt_norm_bounds: [0.0, 2.41],
    },
  };
}
