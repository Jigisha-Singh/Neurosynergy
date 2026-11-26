-- PostgreSQL Schema for Automated EEG Seizure Detection & Prediction Platform

CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    subject_code VARCHAR(32) UNIQUE NOT NULL,
    cohort_group VARCHAR(32) NOT NULL DEFAULT 'LOSO_POOL', -- 'LOSO_POOL' or 'HELD_OUT_CHB16_22'
    age_years NUMERIC(4, 1),
    sex VARCHAR(16),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eeg_recordings (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    sampling_rate_hz INTEGER NOT NULL DEFAULT 256,
    num_channels INTEGER NOT NULL DEFAULT 22,
    duration_sec DOUBLE PRECISION NOT NULL,
    seizure_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eeg_epochs (
    id SERIAL PRIMARY KEY,
    recording_id INTEGER NOT NULL REFERENCES eeg_recordings(id) ON DELETE CASCADE,
    subject_code VARCHAR(32) NOT NULL,
    start_sec DOUBLE PRECISION NOT NULL,
    duration_sec DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    state_label VARCHAR(16) NOT NULL, -- 'interictal', 'preictal', 'ictal'
    stride_samples INTEGER NOT NULL,
    ds_qi DOUBLE PRECISION,
    sii_composite DOUBLE PRECISION,
    laplacian_lambda_2 DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS benchmark_runs (
    id SERIAL PRIMARY KEY,
    pathway_code VARCHAR(64) NOT NULL, -- 'spiking_conformer', 'st_gnn', 'multidomain_ml', 'cwt_scalogram', 'biomarker_indices'
    pathway_name VARCHAR(128) NOT NULL,
    validation_protocol VARCHAR(32) NOT NULL DEFAULT 'LOSO', -- 'LOSO', 'LOPO', 'HELD_OUT_CHB16_22'
    held_out_subject VARCHAR(32),
    accuracy DOUBLE PRECISION NOT NULL,
    sensitivity DOUBLE PRECISION NOT NULL,
    specificity DOUBLE PRECISION NOT NULL,
    roc_auc DOUBLE PRECISION NOT NULL,
    pr_auc DOUBLE PRECISION NOT NULL,
    compute_ops_ratio DOUBLE PRECISION NOT NULL, -- relative ops vs dense baseline (e.g., 0.10 = 10x reduction)
    spike_active_ratio DOUBLE PRECISION,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS explainability_records (
    id SERIAL PRIMARY KEY,
    benchmark_run_id INTEGER REFERENCES benchmark_runs(id) ON DELETE SET NULL,
    feature_or_region VARCHAR(128) NOT NULL,
    domain_name VARCHAR(64) NOT NULL, -- 'time', 'frequency', 'wavelet', 'nonlinear', 'snn', 'graph', 'biomarker'
    shap_importance DOUBLE PRECISION NOT NULL,
    aperiodic_exponent DOUBLE PRECISION,
    periodic_peak_hz DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epochs_subject_state ON eeg_epochs(subject_code, state_label);
CREATE INDEX IF NOT EXISTS idx_runs_pathway ON benchmark_runs(pathway_code, validation_protocol);
