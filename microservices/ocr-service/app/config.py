from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8002
    cors_origins: str = "*"
    tesseract_cmd: str | None = None


settings = Settings()
