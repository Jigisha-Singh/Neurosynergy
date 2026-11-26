-- Seed data for EEG Seizure Detection & Prediction Platform

INSERT INTO subjects (subject_code, cohort_group, age_years, sex) VALUES
    ('chb01', 'LOSO_POOL', 11.0, 'F'),
    ('chb02', 'LOSO_POOL', 11.0, 'M'),
    ('chb03', 'LOSO_POOL', 14.0, 'F'),
    ('chb05', 'LOSO_POOL', 7.0, 'F'),
    ('chb16', 'HELD_OUT_CHB16_22', 7.0, 'F'),
    ('chb17', 'HELD_OUT_CHB16_22', 12.0, 'M'),
    ('chb18', 'HELD_OUT_CHB16_22', 18.0, 'F'),
    ('chb19', 'HELD_OUT_CHB16_22', 19.0, 'F'),
    ('chb20', 'HELD_OUT_CHB16_22', 6.0, 'F'),
    ('chb21', 'HELD_OUT_CHB16_22', 13.0, 'F'),
    ('chb22', 'HELD_OUT_CHB16_22', 9.0, 'F')
ON CONFLICT (subject_code) DO NOTHING;

INSERT INTO eeg_recordings (subject_id, file_name, sampling_rate_hz, num_channels, duration_sec, seizure_count)
SELECT id, subject_code || '_01.edf', 256, 22, 3600.0, 2
FROM subjects
WHERE subject_code IN ('chb01', 'chb02', 'chb03', 'chb16', 'chb19')
ON CONFLICT DO NOTHING;

INSERT INTO eeg_epochs (recording_id, subject_code, start_sec, duration_sec, state_label, stride_samples, ds_qi, sii_composite, laplacian_lambda_2)
SELECT r.id, r.subject_code, 120.0, 5.0, 'interictal', 640, 1.24, 14.8, 0.42
FROM eeg_recordings r
ON CONFLICT DO NOTHING;

INSERT INTO eeg_epochs (recording_id, subject_code, start_sec, duration_sec, state_label, stride_samples, ds_qi, sii_composite, laplacian_lambda_2)
SELECT r.id, r.subject_code, 1500.0, 5.0, 'preictal', 256, 1.58, 22.4, 0.69
FROM eeg_recordings r
ON CONFLICT DO NOTHING;

INSERT INTO eeg_epochs (recording_id, subject_code, start_sec, duration_sec, state_label, stride_samples, ds_qi, sii_composite, laplacian_lambda_2)
SELECT r.id, r.subject_code, 1820.0, 5.0, 'ictal', 51, 1.89, 38.6, 0.91
FROM eeg_recordings r
ON CONFLICT DO NOTHING;

INSERT INTO benchmark_runs (
    pathway_code, pathway_name, validation_protocol, held_out_subject,
    accuracy, sensitivity, specificity, roc_auc, pr_auc, compute_ops_ratio, spike_active_ratio, notes
) VALUES
    ('spiking_conformer', '1. Neuromorphic Spiking Conformer', 'LOSO', 'chb16', 0.9710, 0.9490, 0.9930, 0.9840, 0.9720, 0.10, 0.62, 'T=8 LIF neurons, 1x25 temporal + 22x1 spatial conv, Softmax-Free SSA, T_th=2 masking'),
    ('st_gnn', '2. Spatial-Temporal GNN (TBL-PDBNet / NeuroGraph-DSF)', 'LOPO', 'chb17', 0.9808, 0.9797, 0.9819, 0.9992, 0.9960, 0.85, NULL, 'Dynamic wPLI + PCC graphs, CPL/GE/CC/LE topology, parallel BiLSTM + Transformer'),
    ('multidomain_ml', '3. 924D Multi-Domain Ensemble (XGBoost/LightGBM)', 'LOSO', 'chb18', 0.8840, 0.8520, 0.9160, 0.7960, 0.7740, 0.25, NULL, '42 features/ch x 22 ch; peak-to-peak amplitude & alpha/beta ratio key cross-patient drivers'),
    ('cwt_scalogram', '4. 3-Class CWT Morlet Scalogram (5th-95th Clip)', 'HELD_OUT_CHB16_22', 'chb19', 0.9460, 0.9280, 0.9610, 0.9650, 0.9510, 0.70, NULL, '127 Morlet scales, 224x224 RGB, global clipping [0.000, 2.410], ictal beta/gamma shift'),
    ('biomarker_indices', '5. Compact Clinical Biomarkers (DS-Qi & SII)', 'LOSO', 'chb20', 0.8650, 0.8600, 0.8300, 0.9000, 0.8820, 0.02, NULL, 'Posterior theta/alpha + (1 - wPLI_beta) DS-Qi and delta/line-length/log-var SII')
ON CONFLICT DO NOTHING;

INSERT INTO explainability_records (benchmark_run_id, feature_or_region, domain_name, shap_importance, aperiodic_exponent, periodic_peak_hz)
SELECT id, 'Peak-to-Peak Amplitude (Temporal)', 'time', 0.342, 1.48, 6.2
FROM benchmark_runs WHERE pathway_code = 'multidomain_ml' LIMIT 1;

INSERT INTO explainability_records (benchmark_run_id, feature_or_region, domain_name, shap_importance, aperiodic_exponent, periodic_peak_hz)
SELECT id, 'Posterior Theta/Alpha + Beta wPLI (DS-Qi)', 'biomarker', 0.289, 1.62, 5.8
FROM benchmark_runs WHERE pathway_code = 'biomarker_indices' LIMIT 1;

INSERT INTO explainability_records (benchmark_run_id, feature_or_region, domain_name, shap_importance, aperiodic_exponent, periodic_peak_hz)
SELECT id, 'Alpha/Beta Power Ratio & Welch PSD', 'frequency', 0.218, 1.54, 9.5
FROM benchmark_runs WHERE pathway_code = 'multidomain_ml' LIMIT 1;

INSERT INTO explainability_records (benchmark_run_id, feature_or_region, domain_name, shap_importance, aperiodic_exponent, periodic_peak_hz)
SELECT id, 'db4 Wavelet Energy & Permutation Entropy', 'wavelet', 0.151, 1.41, 14.2
FROM benchmark_runs WHERE pathway_code = 'multidomain_ml' LIMIT 1;
