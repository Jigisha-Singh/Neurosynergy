from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any


@dataclass
class BenchmarkRecord:
    id: int
    pathway_code: str
    pathway_name: str
    validation_protocol: str
    held_out_subject: str
    accuracy: float
    sensitivity: float
    specificity: float
    roc_auc: float
    pr_auc: float
    compute_ops_ratio: float
    spike_active_ratio: float | None
    notes: str


class EEGPlatformStore:
    def __init__(self) -> None:
        self.subjects: list[dict[str, Any]] = [
            {"subject_code": "chb01", "cohort_group": "LOSO_POOL", "age_years": 11.0, "sex": "F", "seizure_count": 7},
            {"subject_code": "chb02", "cohort_group": "LOSO_POOL", "age_years": 11.0, "sex": "M", "seizure_count": 3},
            {"subject_code": "chb03", "cohort_group": "LOSO_POOL", "age_years": 14.0, "sex": "F", "seizure_count": 7},
            {"subject_code": "chb16", "cohort_group": "HELD_OUT_CHB16_22", "age_years": 7.0, "sex": "F", "seizure_count": 10},
            {"subject_code": "chb17", "cohort_group": "HELD_OUT_CHB16_22", "age_years": 12.0, "sex": "M", "seizure_count": 3},
            {"subject_code": "chb18", "cohort_group": "HELD_OUT_CHB16_22", "age_years": 18.0, "sex": "F", "seizure_count": 6},
            {"subject_code": "chb19", "cohort_group": "HELD_OUT_CHB16_22", "age_years": 19.0, "sex": "F", "seizure_count": 3},
            {"subject_code": "chb20", "cohort_group": "HELD_OUT_CHB16_22", "age_years": 6.0, "sex": "F", "seizure_count": 8},
            {"subject_code": "chb21", "cohort_group": "HELD_OUT_CHB16_22", "age_years": 13.0, "sex": "F", "seizure_count": 4},
            {"subject_code": "chb22", "cohort_group": "HELD_OUT_CHB16_22", "age_years": 9.0, "sex": "F", "seizure_count": 3},
        ]
        self.benchmarks: list[BenchmarkRecord] = [
            BenchmarkRecord(
                id=1,
                pathway_code="spiking_conformer",
                pathway_name="1. Neuromorphic Spiking Conformer",
                validation_protocol="LOSO",
                held_out_subject="chb16",
                accuracy=0.9710,
                sensitivity=0.9490,
                specificity=0.9930,
                roc_auc=0.9840,
                pr_auc=0.9720,
                compute_ops_ratio=0.10,
                spike_active_ratio=0.62,
                notes="T=8 LIF neurons, 1x25 temporal + 22x1 spatial conv, Softmax-Free SSA, T_th=2 masking",
            ),
            BenchmarkRecord(
                id=2,
                pathway_code="st_gnn",
                pathway_name="2. Spatial-Temporal GNN (TBL-PDBNet / NeuroGraph-DSF)",
                validation_protocol="LOPO",
                held_out_subject="chb17",
                accuracy=0.9808,
                sensitivity=0.9797,
                specificity=0.9819,
                roc_auc=0.9992,
                pr_auc=0.9960,
                compute_ops_ratio=0.85,
                spike_active_ratio=None,
                notes="Dynamic wPLI + PCC graphs, CPL/GE/CC/LE topology, parallel BiLSTM + Transformer",
            ),
            BenchmarkRecord(
                id=3,
                pathway_code="multidomain_ml",
                pathway_name="3. 924D Multi-Domain Ensemble (XGBoost/LightGBM)",
                validation_protocol="LOSO",
                held_out_subject="chb18",
                accuracy=0.8840,
                sensitivity=0.8520,
                specificity=0.9160,
                roc_auc=0.7960,
                pr_auc=0.7740,
                compute_ops_ratio=0.25,
                spike_active_ratio=None,
                notes="42 features/ch x 22 ch; peak-to-peak amplitude & alpha/beta ratio key cross-patient drivers",
            ),
            BenchmarkRecord(
                id=4,
                pathway_code="cwt_scalogram",
                pathway_name="4. 3-Class CWT Morlet Scalogram (5th-95th Clip)",
                validation_protocol="HELD_OUT_CHB16_22",
                held_out_subject="chb19",
                accuracy=0.9460,
                sensitivity=0.9280,
                specificity=0.9610,
                roc_auc=0.9650,
                pr_auc=0.9510,
                compute_ops_ratio=0.70,
                spike_active_ratio=None,
                notes="127 Morlet scales, 224x224 RGB, global clipping [0.000, 2.410], ictal beta/gamma shift",
            ),
            BenchmarkRecord(
                id=5,
                pathway_code="biomarker_indices",
                pathway_name="5. Compact Clinical Biomarkers (DS-Qi & SII)",
                validation_protocol="LOSO",
                held_out_subject="chb20",
                accuracy=0.8650,
                sensitivity=0.8600,
                specificity=0.8300,
                roc_auc=0.9000,
                pr_auc=0.8820,
                compute_ops_ratio=0.02,
                spike_active_ratio=None,
                notes="Posterior theta/alpha + (1 - wPLI_beta) DS-Qi and delta/line-length/log-var SII",
            ),
        ]
        self.telemetry_history: list[dict[str, Any]] = []

    def add_benchmark(self, payload: dict[str, Any]) -> BenchmarkRecord:
        next_id = max((b.id for b in self.benchmarks), default=0) + 1
        rec = BenchmarkRecord(id=next_id, **payload)
        self.benchmarks.append(rec)
        return rec


store = EEGPlatformStore()
