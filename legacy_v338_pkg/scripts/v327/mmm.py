#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple MMM & Incrementality helpers (lightweight)

This is intentionally pragmatic:
- MMM: OLS regression of revenue on channel spends (with optional intercept)
- Incrementality lift: holdout vs exposed difference-in-differences (simple)

Note: For serious MMM you'd add adstock, saturation, priors, diagnostics.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
import math

def _transpose(a): return list(map(list, zip(*a)))

def _matmul(A, B):
    # A: n x k, B: k x m
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
    # Gauss-Jordan (small matrices)
    n=len(M)
    A=[row[:] + [1.0 if i==j else 0.0 for j in range(n)] for i,row in enumerate(M)]
    for i in range(n):
        # pivot
        piv=i
        for r in range(i,n):
            if abs(A[r][i]) > abs(A[piv][i]): piv=r
        if abs(A[piv][i]) < 1e-12:
            raise ValueError("Singular matrix")
        A[i],A[piv]=A[piv],A[i]
        div=A[i][i]
        for j in range(2*n): A[i][j]/=div
        for r in range(n):
            if r==i: continue
            factor=A[r][i]
            if abs(factor) < 1e-12: continue
            for j in range(2*n):
                A[r][j] -= factor*A[i][j]
    return [row[n:] for row in A]

def ols(spend_rows: List[Dict[str, float]], revenue: List[float], *, add_intercept=True) -> Dict[str, float]:
    """
    spend_rows: list of dicts {channel: spend}
    revenue: list of y values
    returns: coefficients by channel (and intercept if enabled)
    """
    if len(spend_rows) != len(revenue) or not spend_rows:
        raise ValueError("Invalid data length")
    channels=sorted({k for row in spend_rows for k in row.keys()})
    X=[]
    for row in spend_rows:
        vec=[]
        if add_intercept: vec.append(1.0)
        for ch in channels: vec.append(float(row.get(ch,0.0)))
        X.append(vec)
    y=[[float(v)] for v in revenue]
    Xt=_transpose(X)
    XtX=_matmul(Xt,X)
    XtX_inv=_inv(XtX)
    beta=_matmul(_matmul(XtX_inv,Xt),y)  # (k x 1)
    out={}
    idx=0
    if add_intercept:
        out["intercept"]=beta[0][0]; idx=1
    for i,ch in enumerate(channels):
        out[ch]=beta[idx+i][0]
    return out

def lift(exposed: List[float], holdout: List[float]) -> Dict[str, float]:
    """
    Simple lift estimate: (mean_exposed - mean_holdout) / mean_holdout
    """
    if not exposed or not holdout:
        raise ValueError("Need exposed and holdout")
    me=sum(exposed)/len(exposed)
    mh=sum(holdout)/len(holdout)
    if abs(mh) < 1e-12:
        return {"lift": float("inf"), "mean_exposed": me, "mean_holdout": mh}
    return {"lift": (me-mh)/mh, "mean_exposed": me, "mean_holdout": mh}
