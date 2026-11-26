export type PhysiologicalState = "interictal" | "preictal" | "ictal";

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
}

export interface SubjectRecord {
  subject_code: string;
  cohort_group: "LOSO_POOL" | "HELD_OUT_CHB16_22" | string;
  age_years: number;
  sex: string;
  seizure_count: number;
}

export interface SubjectsResponse {
  subjects: SubjectRecord[];
  held_out_cohort: string[];
}

export interface AnalysisRequest {
  subject_code: string;
  num_channels: number;
  samples_per_channel: number;
  state_hint: PhysiologicalState;
  seed: number;
}

export interface BenchmarkRow {
  id: number;
  pathway_code: string;
  pathway_name: string;
  validation_protocol: string;
  held_out_subject: string;
  accuracy: number;
  sensitivity: number;
  specificity: number;
  roc_auc: number;
  pr_auc: number;
  compute_ops_ratio: number;
  spike_active_ratio: number | null;
  notes: string;
}

export interface BenchmarkCreatePayload {
  pathway_code: string;
  pathway_name: string;
  validation_protocol: string;
  held_out_subject: string;
  accuracy: number;
  sensitivity: number;
  specificity: number;
  roc_auc: number;
  pr_auc: number;
  compute_ops_ratio: number;
  spike_active_ratio: number | null;
  notes: string;
}

export interface SpikingConformerOutput {
  predicted_state: string;
  confidence: number;
  spike_rate: number;
  compute_active_ratio: number;
  estimated_ops_reduction_x: number;
}

export interface GraphTopologyOutput {
  characteristic_path_length: number;
  global_efficiency: number;
  clustering_coefficient: number;
  local_efficiency: number;
  laplacian_lambda_2: number;
  mean_pcc_weight: number;
  mean_wpli_weight: number;
}

export interface BiomarkerOutput {
  ds_qi: number;
  posterior_theta_alpha: number;
  mean_wpli_beta: number;
  sii_composite: number;
  p_delta: number;
  line_length: number;
  log_variance: number;
}

export interface ExplainabilitySummary {
  top_features: Array<{ name: string; shap: number }>;
  aperiodic_exponent: number;
  periodic_peak_hz: number;
  cwt_norm_bounds: number[];
}

export interface AnalysisResponse {
  subject_code: string;
  state_hint: string;
  preprocessing_summary: {
    sampling_rate_hz: number;
    bandpass_hz: string;
    notch_hz: number;
    stride_samples_used: number;
  };
  spiking_conformer: SpikingConformerOutput;
  graph_topology: GraphTopologyOutput;
  biomarkers: BiomarkerOutput;
  explainability: ExplainabilitySummary;
}

export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(detail || `HTTP ${res.status} on ${path}`);
    }
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

export function fetchHealth(): Promise<HealthStatus> {
  return requestJson<HealthStatus>("/api/v1/health");
}

export function fetchSubjects(): Promise<SubjectsResponse> {
  return requestJson<SubjectsResponse>("/api/v1/subjects");
}

export function fetchBenchmarks(): Promise<BenchmarkRow[]> {
  return requestJson<BenchmarkRow[]>("/api/v1/benchmarks");
}

export function createBenchmark(payload: BenchmarkCreatePayload): Promise<BenchmarkRow> {
  return requestJson<BenchmarkRow>("/api/v1/benchmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function analyzeEEGWindow(payload: AnalysisRequest): Promise<AnalysisResponse> {
  return requestJson<AnalysisResponse>("/api/v1/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
