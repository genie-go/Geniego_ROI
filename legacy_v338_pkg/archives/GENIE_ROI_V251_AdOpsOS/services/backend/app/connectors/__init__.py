from .google import GoogleAdsConnector
from .meta import MetaAdsConnector
from .tiktok import TikTokAdsConnector
from .naver import NaverSearchAdConnector
from .kakao import KakaoMomentConnector

def get_all_connectors():
    return [
        GoogleAdsConnector(),
        MetaAdsConnector(),
        TikTokAdsConnector(),
        NaverSearchAdConnector(),
        KakaoMomentConnector(),
    ]
