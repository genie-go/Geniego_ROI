#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OIDC JWT verifier (stdlib + cryptography)

Design goals:
- Works behind an IdP (Okta/AzureAD/Keycloak/Auth0/Google) using JWKS
- Caches JWKS in memory with TTL
- Verifies: signature (RS256/ES256), exp/nbf, iss, aud
- Maps token claims to username/email

Env:
- GENIE_ROI_OIDC_ENABLED=1
- GENIE_ROI_OIDC_JWKS_URL=https://.../.well-known/jwks.json  (or file:///abs/path/jwks.json)
- GENIE_ROI_OIDC_ISSUER=https://.../ (optional but recommended)
- GENIE_ROI_OIDC_AUDIENCE=... (optional but recommended)
- GENIE_ROI_OIDC_CLAIM=email (or preferred_username/sub)
- GENIE_ROI_OIDC_JWKS_TTL_SECONDS=3600
"""
from __future__ import annotations
import base64, json, os, time, urllib.request, urllib.parse
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa, ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from cryptography.hazmat.primitives.serialization import load_pem_public_key

def _b64url_decode(s: str) -> bytes:
    pad = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode((s + pad).encode('ascii'))

def _now() -> int:
    return int(time.time())

@dataclass
class OIDCConfig:
    enabled: bool
    jwks_url: str
    issuer: Optional[str]
    audience: Optional[str]
    claim: str
    ttl_seconds: int

def load_config() -> OIDCConfig:
    enabled = os.getenv("GENIE_ROI_OIDC_ENABLED","0") == "1"
    jwks_url = os.getenv("GENIE_ROI_OIDC_JWKS_URL","").strip()
    issuer = os.getenv("GENIE_ROI_OIDC_ISSUER","").strip() or None
    audience = os.getenv("GENIE_ROI_OIDC_AUDIENCE","").strip() or None
    claim = os.getenv("GENIE_ROI_OIDC_CLAIM","email").strip() or "email"
    ttl_seconds = int(os.getenv("GENIE_ROI_OIDC_JWKS_TTL_SECONDS","3600"))
    return OIDCConfig(enabled=enabled, jwks_url=jwks_url, issuer=issuer, audience=audience, claim=claim, ttl_seconds=ttl_seconds)

class JWKSCache:
    def __init__(self, url: str, ttl_seconds: int):
        self.url = url
        self.ttl_seconds = ttl_seconds
        self._data: Optional[Dict[str, Any]] = None
        self._fetched_at = 0

    def get(self) -> Dict[str, Any]:
        if not self.url:
            raise ValueError("JWKS URL not configured (GENIE_ROI_OIDC_JWKS_URL).")
        if self._data and (_now() - self._fetched_at) < self.ttl_seconds:
            return self._data
        self._data = self._fetch()
        self._fetched_at = _now()
        return self._data

    def _fetch(self) -> Dict[str, Any]:
        if self.url.startswith("file://"):
            path = urllib.parse.urlparse(self.url).path
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        req = urllib.request.Request(self.url, headers={"User-Agent":"GENIE_ROI_V327"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))

def _jwk_to_public_key(jwk: Dict[str, Any]):
    kty = jwk.get("kty")
    if kty == "RSA":
        n = int.from_bytes(_b64url_decode(jwk["n"]), "big")
        e = int.from_bytes(_b64url_decode(jwk["e"]), "big")
        pub = rsa.RSAPublicNumbers(e, n).public_key()
        return pub
    if kty == "EC":
        crv = jwk.get("crv")
        x = int.from_bytes(_b64url_decode(jwk["x"]), "big")
        y = int.from_bytes(_b64url_decode(jwk["y"]), "big")
        if crv == "P-256":
            curve = ec.SECP256R1()
        elif crv == "P-384":
            curve = ec.SECP384R1()
        elif crv == "P-521":
            curve = ec.SECP521R1()
        else:
            raise ValueError(f"Unsupported EC curve: {crv}")
        pub = ec.EllipticCurvePublicNumbers(x, y, curve).public_key()
        return pub
    raise ValueError(f"Unsupported JWK kty: {kty}")

def parse_jwt(token: str) -> Tuple[Dict[str, Any], Dict[str, Any], bytes]:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")
    header = json.loads(_b64url_decode(parts[0]).decode("utf-8"))
    payload = json.loads(_b64url_decode(parts[1]).decode("utf-8"))
    signature = _b64url_decode(parts[2])
    signing_input = (parts[0] + "." + parts[1]).encode("ascii")
    return header, payload, signature, signing_input

def verify_jwt(token: str, cfg: OIDCConfig, jwks_cache: JWKSCache) -> Dict[str, Any]:
    header, payload, sig, signing_input = parse_jwt(token)
    alg = header.get("alg")
    kid = header.get("kid")
    jwks = jwks_cache.get()
    keys = jwks.get("keys", [])
    jwk = None
    for k in keys:
        if kid and k.get("kid") == kid:
            jwk = k
            break
    if jwk is None and keys:
        jwk = keys[0]
    if jwk is None:
        raise ValueError("No JWKS keys available for verification")

    pub = _jwk_to_public_key(jwk)

    # Claims validation
    now = _now()
    if "exp" in payload and int(payload["exp"]) < now:
        raise ValueError("JWT expired")
    if "nbf" in payload and int(payload["nbf"]) > now + 60:
        raise ValueError("JWT not yet valid")
    if cfg.issuer and payload.get("iss") != cfg.issuer:
        raise ValueError("JWT issuer mismatch")
    if cfg.audience:
        aud = payload.get("aud")
        if isinstance(aud, list):
            if cfg.audience not in aud:
                raise ValueError("JWT audience mismatch")
        elif aud != cfg.audience:
            raise ValueError("JWT audience mismatch")

    # Signature verification
    if alg == "RS256":
        pub.verify(sig, signing_input, padding.PKCS1v15(), hashes.SHA256())
    elif alg == "ES256":
        # JWT uses raw (r||s) signature; cryptography expects DER encoded
        if len(sig) != 64:
            raise ValueError("Invalid ES256 signature length")
        r = int.from_bytes(sig[:32], "big")
        s = int.from_bytes(sig[32:], "big")
        der = decode_dss_signature(r, s)
        pub.verify(der, signing_input, ec.ECDSA(hashes.SHA256()))
    else:
        raise ValueError(f"Unsupported JWT alg: {alg}")

    return payload

def extract_username(claims: Dict[str, Any], claim: str) -> str:
    val = claims.get(claim)
    if not val:
        # fallback
        for k in ("email","preferred_username","upn","sub"):
            if claims.get(k):
                val = claims[k]; break
    if not val:
        raise ValueError("No usable username claim in token")
    return str(val)
