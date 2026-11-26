from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class Settings:
    app_name: str = "EEG Seizure Detection & Prediction API"
    version: str = "1.0.0"
    sampling_rate_hz: int = 256
    num_channels: int = 22
    window_samples: int = 1280
    bandpass_low_hz: float = 0.5
    bandpass_high_hz: float = 40.0
    notch_freq_hz: float = 60.0
    ictal_stride_samples: int = 51
    interictal_stride_samples: int = 640
    lif_timesteps: int = 8
    lif_v_threshold: float = 1.0
    lif_v_reset: float = 0.0
    lif_tau_m: float = 2.0
    lif_t_th_mask: int = 2
    cwt_norm_min: float = 0.000
    cwt_norm_max: float = 2.410
    held_out_cohort: list[str] = field(
        default_factory=lambda: ["chb16", "chb17", "chb18", "chb19", "chb20", "chb21", "chb22"]
    )


settings = Settings()
