from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8003
    cors_origins: str = "*"
    dataset_dir: str = "datasets"
    model_dir: str = "models"
    front_model_file: str = "front_classifier.keras"
    back_model_file: str = "back_classifier.keras"
    valid_threshold: float = 0.50
    input_size: int = 224


settings = Settings()
