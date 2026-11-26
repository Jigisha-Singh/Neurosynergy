from __future__ import annotations
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_and_benchmarks() -> None:
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    bench = client.get("/api/v1/benchmarks")
    assert bench.status_code == 200
    assert len(bench.json()) == 5


def test_eeg_analysis_endpoint() -> None:
    payload = {
        "subject_code": "chb01",
        "num_channels": 22,
        "samples_per_channel": 1280,
        "state_hint": "preictal",
        "seed": 7,
    }
    res = client.post("/api/v1/analyze", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["subject_code"] == "chb01"
    assert "ds_qi" in data["biomarkers"]
    assert "laplacian_lambda_2" in data["graph_topology"]
