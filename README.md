# Automated EEG-Based Epileptic Seizure Detection & Prediction Framework

Full-stack starter repository covering:
- **Backend (`backend/`)**: FastAPI signal-processing & inference engine implementing 0.5–40 Hz Butterworth bandpass, 60 Hz notch, channel-wise z-scoring, PCC & β-band wPLI matrices, graph topology (CPL, GE, CC, LE, Laplacian λ₂), `DS-Qi` and `SII` clinical biomarkers, and a Spiking Conformer (`T=8`, LIF neurons, Softmax-Free SSA, `T_th=2` masking).
- **Database (`database/`)**: PostgreSQL schema (`schema.sql`) and seed records (`seed.sql`) for subjects (`chb16–chb22` held-out cohort), recordings, 5s epochs, benchmark runs, and SHAP/FOOOF explainability records.
- **Frontend (`frontend/`)**: React + TypeScript workbench for running 5-second window simulations and comparing all the five benchmark pathways.

## Local Run

```bash
# Backend tests
cd backend && pip install -r requirements.txt && pytest -v

# Start FastAPI
uvicorn app.main:app --reload --port 8000

# Start Frontend (in a second terminal)
cd frontend && npm install && npm run dev
```
