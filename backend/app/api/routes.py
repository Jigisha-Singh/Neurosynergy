from __future__ import annotations
from fastapi import APIRouter

from app.core.config import settings
from app.db.store import store
from app.models.schemas import BenchmarkRunCreate, EEGAnalysisRequest, EEGAnalysisResponse
from app.services.signal_engine import run_eeg_pipeline

router = APIRouter(prefix="/api/v1", tags=["eeg-platform"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name, "version": settings.version}


@router.get("/subjects")
def list_subjects() -> dict[str, object]:
    return {
        "subjects": store.subjects,
        "held_out_cohort": settings.held_out_cohort,
    }


@router.get("/benchmarks")
def list_benchmarks() -> list[dict[str, object]]:
    return [b.__dict__ for b in store.benchmarks]


@router.post("/benchmarks", status_code=201)
def create_benchmark(payload: BenchmarkRunCreate) -> dict[str, object]:
    created = store.add_benchmark(payload.model_dump())
    return created.__dict__


@router.post("/analyze", response_model=EEGAnalysisResponse)
def analyze_eeg(req: EEGAnalysisRequest) -> EEGAnalysisResponse:
    result = run_eeg_pipeline(req)
    store.telemetry_history.append(
        {
            "subject_code": result.subject_code,
            "state_hint": result.state_hint,
            "ds_qi": result.biomarkers.ds_qi,
            "sii_composite": result.biomarkers.sii_composite,
            "laplacian_lambda_2": result.graph_topology.laplacian_lambda_2,
        }
    )
    return result
