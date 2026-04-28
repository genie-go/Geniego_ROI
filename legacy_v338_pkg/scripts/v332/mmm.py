#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GENIE_ROI V328 MMM (Adstock / Saturation / Diagnostics / Auto-Interpretation)

Design goals
- Stdlib-only (no numpy/pandas)
- Practical for "directional" insights and budget simulation
- Outputs: coefficients + contributions + diagnostics + narrative report text

Inputs (typical)
- dates: list[str] (YYYY-MM-DD)
- y: list[float] revenue (or conversions)
- X: dict[channel]-> list[float] spend (same length)

Features
- Adstock: geometric decay + optional lag
- Saturation: Hill function (diminishing returns)
- Diagnostics: R2/AdjR2, residual stats, simple collinearity check (corr matrix)
- Auto report: plain-language explanation and caveats

NOTE
- This is not Bayesian MMM. If you need priors, uncertainty intervals, or
  hierarchical effects, integrate PyMC/Stan outside this stdlib package.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional, Any
import math

# ----------------- math helpers (small matrices) -----------------
def _transpose(a): return list(map(list, zip(*a)))

def _matmul(A, B):
    n=len(A); k=len(A[0]); m=len(B[0])
    out=[[0.0]*m for _ in range(n)]
    for i in range(n):
        for j in range(m):
            s=0.0
            for t in range(k):
                s += A[i][t]*B[t][j]
            out[i][j]=s
    return out

def _inv(M):
    n=len(M)
    # augment with identity
    A=[row[:] + [0.0]*n for row in M]
    for i in range(n): A[i][n+i]=1.0
    # Gauss-Jordan
    for col in range(n):
        # pivot
        pivot=col
        for r in range(col,n):
            if abs(A[r][col]) > abs(A[pivot][col]): pivot=r
        if abs(A[pivot][col]) < 1e-12:
            raise ValueError("Singular matrix in OLS; try removing collinear features.")
        if pivot!=col:
            A[col],A[pivot]=A[pivot],A[col]
        # normalize
        div=A[col][col]
        for c in range(2*n):
            A[col][c] /= div
        # eliminate
        for r in range(n):
            if r==col: continue
            factor=A[r][col]
            if abs(factor) < 1e-15: 
                A[r][col]=0.0
                continue
            for c in range(2*n):
                A[r][c] -= factor*A[col][c]
    return [row[n:] for row in A]

def _ols_fit(y: List[float], X: List[List[float]]) -> Tuple[List[float], Dict[str,float], List[float]]:
    # y: n, X: n x k (already includes intercept if needed)
    n=len(y); k=len(X[0])
    Xt=_transpose(X)                  # k x n
    XtX=_matmul(Xt, X)               # k x k
    XtY=_matmul(Xt, [[v] for v in y])# k x 1
    beta=_matmul(_inv(XtX), XtY)     # k x 1
    beta=[b[0] for b in beta]
    yhat=[sum(X[i][j]*beta[j] for j in range(k)) for i in range(n)]
    resid=[y[i]-yhat[i] for i in range(n)]

    ybar=sum(y)/n
    ss_tot=sum((v-ybar)**2 for v in y)
    ss_res=sum((e)**2 for e in resid)
    r2=1.0 - (ss_res/ss_tot if ss_tot>1e-12 else 0.0)
    adj_r2=1.0 - (1.0-r2)*((n-1)/(max(n-k,1)))
    diag={
        "n": float(n),
        "k": float(k),
        "r2": float(r2),
        "adj_r2": float(adj_r2),
        "rmse": float(math.sqrt(ss_res/max(n,1))),
        "resid_mean": float(sum(resid)/n),
        "resid_std": float(math.sqrt(sum((e-(sum(resid)/n))**2 for e in resid)/max(n-1,1))),
    }
    return beta, diag, yhat

def _corr(a: List[float], b: List[float]) -> float:
    n=len(a)
    ma=sum(a)/n; mb=sum(b)/n
    va=sum((x-ma)**2 for x in a)
    vb=sum((x-mb)**2 for x in b)
    if va<1e-12 or vb<1e-12: return 0.0
    cov=sum((a[i]-ma)*(b[i]-mb) for i in range(n))
    return cov / math.sqrt(va*vb)

# ----------------- transforms -----------------
def adstock_geometric(x: List[float], decay: float=0.5, lag: int=0) -> List[float]:
    """Geometric adstock. decay in [0,1]. lag shifts spend forward (effect after lag days)."""
    decay=max(0.0, min(0.9999, float(decay)))
    lag=int(max(0, lag))
    out=[0.0]*len(x)
    carry=0.0
    for i in range(len(x)):
        carry = x[i] + decay*carry
        j=i+lag
        if j < len(x):
            out[j]=carry
    return out

def saturation_hill(x: List[float], alpha: float=1.5, gamma: float=0.5, scale: Optional[float]=None) -> List[float]:
    """
    Hill saturation in [0,1] roughly.
    alpha: curve steepness (>0), gamma: inflection quantile (0..1)
    scale: spend scale; if None uses median(x) or 1.
    """
    xs=[max(0.0,float(v)) for v in x]
    m=sorted(xs)[len(xs)//2] if xs else 1.0
    s=float(scale) if (scale is not None and scale>0) else (m if m>0 else 1.0)
    # inflection at gamma * scale (simple heuristic)
    k=max(1e-9, gamma*s)
    out=[]
    for v in xs:
        num=(v**alpha)
        den=(v**alpha) + (k**alpha)
        out.append(num/den if den>0 else 0.0)
    return out

@dataclass
class MMMSpec:
    intercept: bool = True
    adstock: Dict[str, Dict[str,Any]] = None   # channel -> {decay, lag}
    saturation: Dict[str, Dict[str,Any]] = None # channel -> {alpha, gamma, scale}
    # optional extra regressors
    extra: Dict[str, List[float]] = None       # name -> series

@dataclass
class MMMResult:
    channels: List[str]
    beta: Dict[str, float]         # coefficient per feature (incl intercept, extras)
    diagnostics: Dict[str, Any]
    contributions: Dict[str, float] # total contribution over window
    yhat: List[float]
    report_text: str

def fit_mmm(dates: List[str], y: List[float], spends: Dict[str, List[float]], spec: Optional[MMMSpec]=None) -> MMMResult:
    spec = spec or MMMSpec()
    adstock = spec.adstock or {}
    saturation = spec.saturation or {}
    extra = spec.extra or {}

    n=len(y)
    if any(len(v)!=n for v in spends.values()):
        raise ValueError("All spend series must match length of y")
    if any(len(v)!=n for v in extra.values()):
        raise ValueError("All extra series must match length of y")

    channels=sorted(spends.keys())
    features=[]
    X=[]

    # prepare transformed series per channel
    series={}
    for ch in channels:
        x=spends[ch]
        if ch in adstock:
            x=adstock_geometric(x, float(adstock[ch].get("decay",0.5)), int(adstock[ch].get("lag",0)))
        if ch in saturation:
            p=saturation[ch]
            x=saturation_hill(x, float(p.get("alpha",1.5)), float(p.get("gamma",0.5)), p.get("scale",None))
        series[ch]=x

    # build design matrix
    if spec.intercept:
        features.append("intercept")
    for ch in channels:
        features.append(f"spend:{ch}")
    for name in sorted(extra.keys()):
        features.append(f"extra:{name}")

    for i in range(n):
        row=[]
        if spec.intercept:
            row.append(1.0)
        for ch in channels:
            row.append(float(series[ch][i]))
        for name in sorted(extra.keys()):
            row.append(float(extra[name][i]))
        X.append(row)

    beta_vec, diag, yhat = _ols_fit([float(v) for v in y], X)

    beta={}
    for j,f in enumerate(features):
        beta[f]=float(beta_vec[j])

    # correlation diagnostics among channel features
    corr={}
    ch_feats=[series[ch] for ch in channels]
    for i,ch1 in enumerate(channels):
        for j,ch2 in enumerate(channels):
            if j<=i: continue
            corr[f"{ch1}~{ch2}"]=float(_corr(ch_feats[i], ch_feats[j]))
    diag["channel_corr"]=corr

    # total contributions
    contributions={}
    for j,f in enumerate(features):
        if f=="intercept":
            contributions[f]=beta[f]*n
        else:
            # sum of x*beta
            idx=j
            s=sum(X[i][idx]*beta_vec[idx] for i in range(n))
            contributions[f]=float(s)

    # narrative
    report=_auto_report(dates, y, channels, beta, contributions, diag, adstock, saturation, extra)

    return MMMResult(
        channels=channels,
        beta=beta,
        diagnostics=diag,
        contributions=contributions,
        yhat=yhat,
        report_text=report
    )

def _auto_report(dates, y, channels, beta, contributions, diag, adstock, saturation, extra):
    y_sum=sum(y)
    top=sorted([(k,v) for k,v in contributions.items() if k.startswith("spend:")], key=lambda x: abs(x[1]), reverse=True)[:5]
    lines=[]
    if dates:
        lines.append(f"분석 기간: {dates[0]} ~ {dates[-1]} (n={int(diag.get('n',0))})")
    lines.append(f"모델 설명력(R²): {diag.get('r2',0):.3f}, 조정 R²: {diag.get('adj_r2',0):.3f}, RMSE: {diag.get('rmse',0):.3f}")
    lines.append("")
    lines.append("채널별 기여(해당 기간 총합, 방향성):")
    for k,v in top:
        ch=k.split(":",1)[1]
        pct=(v/y_sum*100.0) if abs(y_sum)>1e-9 else 0.0
        lines.append(f"- {ch}: {v:,.1f}  ({pct:+.1f}% of total Y)")
    lines.append("")
    # transform summary
    if adstock:
        lines.append("적용된 Adstock(지연/잔존효과):")
        for ch,p in adstock.items():
            lines.append(f"- {ch}: decay={p.get('decay',0.5)}, lag={p.get('lag',0)}d")
    if saturation:
        lines.append("적용된 Saturation(한계효용 체감):")
        for ch,p in saturation.items():
            lines.append(f"- {ch}: alpha={p.get('alpha',1.5)}, gamma={p.get('gamma',0.5)}, scale={p.get('scale','auto')}")
    if extra:
        lines.append("추가 회귀변수(통제): " + ", ".join(sorted(extra.keys())))
    lines.append("")
    # collinearity flags
    high=[(k,v) for k,v in diag.get("channel_corr",{}).items() if abs(v)>=0.85]
    if high:
        lines.append("⚠️ 채널 지출 간 상관이 매우 높습니다(다중공선성 가능):")
        for k,v in sorted(high, key=lambda x: -abs(x[1]))[:8]:
            lines.append(f"- {k}: corr={v:+.2f}")
        lines.append("  → 해석: 개별 채널 '순수 효과'가 과대/과소 추정될 수 있습니다. 캠페인 구조/기간 분리, holdout, geo-test 권장.")
        lines.append("")
    lines.append("해석 가이드:")
    lines.append("- 이 MMM은 '방향성'을 주는 경량 모델입니다. 예산 의사결정은 실험(holdout/geo)과 함께 보세요.")
    lines.append("- 클릭/전환 로그가 불완전한 경우(브라우저 차단, iOS 등)에는 1P Pixel + 서버사이드 이벤트가 특히 중요합니다.")
    return "\n".join(lines)
