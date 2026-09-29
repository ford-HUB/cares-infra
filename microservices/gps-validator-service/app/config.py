from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8005
    cors_origins: str = "*"

    # --- attendance rules -------------------------------------------------
    # Share of the event window the volunteer must be inside the zone.
    required_coverage_ratio: float = 0.90
    # First IN later than this share of the event duration is a late arrival.
    late_entry_ratio: float = 0.50
    # Two consecutive readings further apart than this are a recording gap:
    # the time between them is not credited even if both are inside the zone.
    max_ping_gap_seconds: int = 120
    # Readings this close to the boundary (metres) still count as inside —
    # consumer GPS wobbles, the fence was hand-drawn.
    boundary_tolerance_m: float = 10.0

    # --- anomaly detection -------------------------------------------------
    # Ground speed above this (m/s) between two readings is not human movement.
    max_speed_mps: float = 12.0
    # Readings reporting a horizontal accuracy worse than this are unreliable.
    max_accuracy_m: float = 60.0
    # More IN/OUT transitions than this per hour looks like boundary flapping.
    max_transitions_per_hour: int = 12
    # A device that never moves at all for the whole event is suspicious.
    stationary_radius_m: float = 3.0


settings = Settings()
