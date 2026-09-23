from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8006
    cors_origins: str = "*"

    # --- k-means -----------------------------------------------------------
    # Groups to find when the caller does not say; clamped to the row count.
    default_k: int = 3
    # Lloyd iterations before a run is cut off unconverged.
    max_iterations: int = 50
    # Independent k-means++ starts per run. 1 keeps `seed` meaningful as "one
    # particular start" — the portal's Re-run button walks the seed.
    n_init: int = 1
    # Upper bound on households per request; the survey is small, so this is a
    # guard against a runaway payload rather than a capacity limit.
    max_households: int = 20_000


settings = Settings()
