def roi(spend: float, revenue: float) -> float:
    if spend <= 0:
        return 0.0
    return round((revenue - spend) / spend, 4)
