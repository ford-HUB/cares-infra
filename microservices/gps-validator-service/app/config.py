from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8005
    cors_origins: str = "*"

    # Share of the event window spent inside the zone.
    required_coverage_ratio: float = 0.90
    # First IN after this share of the duration is late.
    late_entry_ratio: float = 0.50
    # Longer gaps between readings are not credited, even if both are inside.
    max_ping_gap_seconds: int = 120
    # Metres outside the fence still counted as inside (GPS wobble, hand-drawn fence).
    boundary_tolerance_m: float = 10.0
    # Absence allowed before an exit becomes the time out; must match
    # DEPARTURE_BUFFER_MS in the server's event-attendance module.
    departure_buffer_seconds: int = 3600

    # Faster is not human movement.
    max_speed_mps: float = 12.0
    max_accuracy_m: float = 60.0
    # Above this is boundary flapping.
    max_transitions_per_hour: int = 12
    # Never leaving this radius all event is suspicious.
    stationary_radius_m: float = 3.0


settings = Settings()
