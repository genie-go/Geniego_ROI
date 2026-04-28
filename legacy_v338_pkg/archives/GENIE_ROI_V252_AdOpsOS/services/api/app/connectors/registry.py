from __future__ import annotations
from typing import Dict, List
from .base import AdsConnector
from .google import GoogleConnector
from .meta import MetaConnector
from .tiktok import TikTokConnector
from .naver import NaverConnector
from .kakao import KakaoConnector

_REGISTRY: Dict[str, AdsConnector] = {
    "google": GoogleConnector(),
    "meta": MetaConnector(),
    "tiktok": TikTokConnector(),
    "naver": NaverConnector(),
    "kakao": KakaoConnector(),
}

def get_connector(provider: str) -> AdsConnector:
    p = (provider or "").lower()
    if p not in _REGISTRY:
        raise KeyError(f"Unknown provider: {provider}")
    return _REGISTRY[p]

def list_connectors() -> List[str]:
    return sorted(_REGISTRY.keys())
