from __future__ import annotations
from pydantic import BaseModel, Field


class EEGAnalysisRequest(BaseModel):
    subject_code: str = Field(default="chb01", min_length=2, max_length=32)
    num_channels: int = Field(default=22, ge=4, le=64)
    samples_per_channel: int = Field(default=1280, ge=256, le=4096)
    state_hint: str = Field(default="preictal", pattern="^(interictal|preictal|ictal)$")
    seed: int = Field(default=42, ge=0, le=100000)


class BiomarkerOutput(BaseModel):
    ds_qi: float
    posterior_theta_alpha: float
    mean_wpli_beta: float
    sii_composite: float
    p_delta: float
    line_length: float
    log_variance: float


class GraphTopologyOutput(BaseModel):
    characteristic_path_length: float
    global_efficiency: float
    clustering_coefficient: float
    local_efficiency: float
    laplacian_lambda_2: float
    mean_pcc_weight: float
    mean_wpli_weight: float


class SpikingConformerOutput(BaseModel):
    predicted_state: str
    confidence: float
    spike_rate: float
    compute_active_ratio: float
    estimated_ops_reduction_x: float


class ExplainabilitySummary(BaseModel):
    top_features: list[dict[str, float | str]]
    aperiodic_exponent: float
    periodic_peak_hz: float
    cwt_norm_bounds: list[float]


class EEGAnalysisResponse(BaseModel):
    subject_code: str
    state_hint: str
    preprocessing_summary: dict[str, float | int | str]
    spiking_conformer: SpikingConformerOutput
    graph_topology: GraphTopologyOutput
    biomarkers: BiomarkerOutput
    explainability: ExplainabilitySummary


class BenchmarkRunCreate(BaseModel):
    pathway_code: str
    pathway_name: str
    validation_protocol: str = "LOSO"
    held_out_subject: str = "chb21"
    accuracy: float = Field(ge=0.0, le=1.0)
    sensitivity: float = Field(ge=0.0, le=1.0)
    specificity: float = Field(ge=0.0, le=1.0)
    roc_auc: float = Field(ge=0.0, le=1.0)
    pr_auc: float = Field(ge=0.0, le=1.0)
    compute_ops_ratio: float = Field(gt=0.0, le=2.0)
    spike_active_ratio: float | None = Field(default=None, ge=0.0, le=1.0)
    notes: str = ""
