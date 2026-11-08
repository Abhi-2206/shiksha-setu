"""FastAPI API package for Shiksha Setu AI Service."""
try:
    from api.main import app
except ImportError:
    from .main import app

__all__ = ["app"]
