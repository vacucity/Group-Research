from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Fast model for translation (cheap, fast)
    fast_api_key: str = "ollama"
    fast_base_url: str = "http://localhost:11434/v1"
    fast_model: str = "qwen2.5:7b"

    # Reasoning model for analysis & Q&A (quality over speed)
    reason_api_key: str = "ollama"
    reason_base_url: str = "http://localhost:11434/v1"
    reason_model: str = "deepseek-r1:14b"

    ai_service_api_key: str = "dev-key"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
