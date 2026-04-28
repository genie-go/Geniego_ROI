package auth

import (
  "crypto"
  "crypto/rsa"
  "crypto/sha256"
  "crypto/x509"
  "encoding/base64"
  "encoding/json"
  "errors"
  "math/big"
  "strings"
  "time"
)

type jwkSet struct {
  Keys []struct{
    Kty string `json:"kty"`
    Kid string `json:"kid"`
    Use string `json:"use"`
    Alg string `json:"alg"`
    N string `json:"n"`
    E string `json:"e"`
    X5c []string `json:"x5c"`
  } `json:"keys"`
}

type idTokenClaims struct {
  Iss string `json:"iss"`
  Sub string `json:"sub"`
  Aud any `json:"aud"`
  Exp int64 `json:"exp"`
  Iat int64 `json:"iat"`
  Nonce string `json:"nonce"`
  Email string `json:"email"`
  Name string `json:"name"`
}

func b64urlDecode(s string) ([]byte, error) {
  s = strings.ReplaceAll(s, "-", "+")
  s = strings.ReplaceAll(s, "_", "/")
  switch len(s)%4 {
  case 2: s += "=="
  case 3: s += "="
  }
  return base64.StdEncoding.DecodeString(s)
}

func parseRSAPublicKeyFromJWK(k any) (*rsa.PublicKey, string, error) {
  kk := k.(map[string]any)
  kid, _ := kk["kid"].(string)
  if x5c, ok := kk["x5c"].([]any); ok && len(x5c) > 0 {
    certB64, _ := x5c[0].(string)
    der, err := base64.StdEncoding.DecodeString(certB64)
    if err != nil { return nil, kid, err }
    cert, err := x509.ParseCertificate(der)
    if err != nil { return nil, kid, err }
    if pk, ok := cert.PublicKey.(*rsa.PublicKey); ok { return pk, kid, nil }
  }
  nStr, _ := kk["n"].(string)
  eStr, _ := kk["e"].(string)
  if nStr=="" || eStr=="" { return nil, kid, errors.New("missing n/e") }
  nb, err := b64urlDecode(nStr); if err!=nil { return nil, kid, err }
  eb, err := b64urlDecode(eStr); if err!=nil { return nil, kid, err }
  n := new(big.Int).SetBytes(nb)
  e := new(big.Int).SetBytes(eb).Int64()
  return &rsa.PublicKey{N:n, E:int(e)}, kid, nil
}

// VerifyRS256JWT verifies signature + exp + iss/aud + nonce.
func VerifyRS256JWT(idToken string, jwksJSON string, expectedIss string, expectedAud string, expectedNonce string) (idTokenClaims, error) {
  parts := strings.Split(idToken, ".")
  if len(parts) != 3 { return idTokenClaims{}, errors.New("invalid jwt") }
  headerB, err := b64urlDecode(parts[0]); if err!=nil { return idTokenClaims{}, err }
  payloadB, err := b64urlDecode(parts[1]); if err!=nil { return idTokenClaims{}, err }
  sigB, err := b64urlDecode(parts[2]); if err!=nil { return idTokenClaims{}, err }

  var header map[string]any
  _ = json.Unmarshal(headerB, &header)
  alg, _ := header["alg"].(string)
  kid, _ := header["kid"].(string)
  if alg != "RS256" { return idTokenClaims{}, errors.New("unsupported alg") }

  // Find key
  var ks map[string]any
  if err := json.Unmarshal([]byte(jwksJSON), &ks); err != nil { return idTokenClaims{}, err }
  keys, _ := ks["keys"].([]any)
  var pub *rsa.PublicKey
  for _, k := range keys {
    m, ok := k.(map[string]any); if !ok { continue }
    if kKid, _ := m["kid"].(string); kid != "" && kKid != kid { continue }
    pk, _, err := parseRSAPublicKeyFromJWK(any(m))
    if err==nil { pub = pk; break }
  }
  if pub == nil { return idTokenClaims{}, errors.New("no matching jwk") }

  signingInput := parts[0] + "." + parts[1]
  h := sha256.Sum256([]byte(signingInput))
  if err := rsa.VerifyPKCS1v15(pub, crypto.SHA256, h[:], sigB); err != nil {
    return idTokenClaims{}, errors.New("bad signature")
  }

  var claims idTokenClaims
  if err := json.Unmarshal(payloadB, &claims); err != nil { return idTokenClaims{}, err }
  if expectedIss != "" && claims.Iss != expectedIss { return idTokenClaims{}, errors.New("iss mismatch") }
  // aud can be string or array
  if expectedAud != "" {
    okAud := false
    switch v := claims.Aud.(type) {
    case string:
      okAud = (v == expectedAud)
    case []any:
      for _, it := range v { if s,ok:=it.(string); ok && s==expectedAud { okAud=true; break } }
    }
    if !okAud { return idTokenClaims{}, errors.New("aud mismatch") }
  }
  if claims.Exp > 0 && time.Now().Unix() > claims.Exp { return idTokenClaims{}, errors.New("token expired") }
  if expectedNonce != "" && claims.Nonce != expectedNonce { return idTokenClaims{}, errors.New("nonce mismatch") }
  return claims, nil
}

// Utility: sha256 hex for evidence
func SHA256Hex(b []byte) string {
  h := sha256.Sum256(b)
  return base64.StdEncoding.EncodeToString(h[:])
}
