from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    github_token: str = ""
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    database_url: str = ""
    chat_history_size: int = 10  # last N Q&A per user+repo loaded from DB

    class Config:
        env_file = ".env"


settings = Settings()
