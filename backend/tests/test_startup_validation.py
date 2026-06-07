"""Startup security validation — smoke tests (3 required cases)."""

from unittest.mock import MagicMock, patch

import pytest

from app.core.startup_validation import StartupSecurityError, run_startup_validation


def _make_settings(**kwargs):
    settings = MagicMock()
    settings.ENVIRONMENT = kwargs.get("ENVIRONMENT", "development")
    settings.AUTH_DISABLED = kwargs.get("AUTH_DISABLED", False)
    settings.auth_disabled = kwargs.get("auth_disabled", False)
    settings.SECRET_KEY = kwargs.get("SECRET_KEY", "super-secret-key-that-is-long-enough-32c")
    settings.DEBUG = kwargs.get("DEBUG", False)
    settings.API_DEBUG = kwargs.get("API_DEBUG", False)
    settings.LOG_LEVEL = kwargs.get("LOG_LEVEL", "INFO")
    settings.BACKEND_CORS_ORIGINS = kwargs.get("BACKEND_CORS_ORIGINS", ["http://localhost:3000"])
    settings.SUPABASE_SERVICE_ROLE_KEY = kwargs.get("SUPABASE_SERVICE_ROLE_KEY", None)
    return settings


def test_dev_allows_auth_disabled():
    """Development: AUTH_DISABLED=true does not block startup."""
    settings = _make_settings(
        ENVIRONMENT="development",
        AUTH_DISABLED=True,
        auth_disabled=True,
    )
    with patch.dict("os.environ", {"AUTH_DISABLED": "true", "ENVIRONMENT": "development"}):
        run_startup_validation(settings)


def test_production_blocks_auth_disabled():
    """Production: AUTH_DISABLED=true raises StartupSecurityError."""
    settings = _make_settings(
        ENVIRONMENT="production",
        AUTH_DISABLED=True,
        auth_disabled=True,
    )
    with patch.dict("os.environ", {"AUTH_DISABLED": "true", "ENVIRONMENT": "production"}):
        with pytest.raises(StartupSecurityError):
            run_startup_validation(settings)


def test_production_valid_config_passes():
    """Production: secure config passes validation."""
    settings = _make_settings(
        ENVIRONMENT="production",
        auth_disabled=False,
        SECRET_KEY="super-secret-key-that-is-long-enough-32c",
    )
    with patch.dict("os.environ", {"AUTH_DISABLED": "false", "ENVIRONMENT": "production"}):
        run_startup_validation(settings)
