import math
from typing import List


# == pearsonR(x, y) — Pearson correlation coefficient ==
def pearson_r(x: List[float], y: List[float]) -> float:
    n = len(x)
    if n != len(y) or n == 0:
        return 0
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    num    = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    den_x  = math.sqrt(sum((xi - mean_x) ** 2 for xi in x))
    den_y  = math.sqrt(sum((yi - mean_y) ** 2 for yi in y))
    if den_x == 0 or den_y == 0:
        return 0
    return round(num / (den_x * den_y), 4)


# == pearsonPValue(r, n) — two-tailed p-value from Pearson r ==
def pearson_p_value(r: float, n: int) -> float:
    if n < 3:
        return 1
    if abs(r) >= 1.0:           # perfect correlation → p = 0
        return 0.0
    t = r * math.sqrt((n - 2) / (1 - r * r))
    p = 2 * (1 - normal_cdf(abs(t)))
    return round(p, 4)


# == correlationStrength(r) — human-readable label ==
def correlation_strength(r: float) -> str:
    abs_r = abs(r)
    if abs_r >= 0.5:
        return 'Strong +'  if r > 0 else 'Strong -'
    if abs_r >= 0.2:
        return 'Moderate +' if r > 0 else 'Moderate -'
    return 'No Correlation'


# == correlationCategory(r) — bucket name for tab counts ==
def correlation_category(r: float) -> str:
    if r >= 0.5:
        return 'strong_positive'
    if r >= 0.2:
        return 'moderate_positive'
    if -0.2 < r < 0.2:
        return 'weak_none'
    if r >= -0.5:
        return 'moderate_negative'
    return 'strong_negative'


# == twoSampleZTest(meanA, meanB, stdA, stdB, nA, nB) ==
def two_sample_z_test(mean_a, mean_b, std_a, std_b, n_a, n_b) -> dict:
    if not n_a or not n_b:
        return {"z": 0, "p": 1, "significant": False}
    se = math.sqrt((std_a ** 2 / n_a) + (std_b ** 2 / n_b))
    if se == 0:
        return {"z": 0, "p": 1, "significant": False}
    z = round((mean_a - mean_b) / se, 4)
    p = round(2 * (1 - normal_cdf(abs(z))), 4)
    return {"z": z, "p": p, "significant": p < 0.05}


# == oneSampleZTest(sampleMean, popMean, stdDev, n) ==
def one_sample_z_test(sample_mean, pop_mean, std_dev, n) -> dict:
    se = std_dev / math.sqrt(n)
    if se == 0:
        return {"z": 0, "p": 1, "significant": False}
    z             = round((sample_mean - pop_mean) / se, 4)
    p_one_tailed  = round(1 - normal_cdf(z), 4)
    p_two_tailed  = round(2 * (1 - normal_cdf(abs(z))), 4)
    return {
        "z":             z,
        "p_one_tailed":  p_one_tailed,
        "p_two_tailed":  p_two_tailed,
        "critical_z_05": 1.645,
        "significant":   p_one_tailed < 0.05,
        "decision":      "Reject H₀" if p_one_tailed < 0.05 else "Fail to reject H₀"
    }


# == normalCDF(x) — Hart algorithm (same coefficients as JS version) ==
def normal_cdf(x: float) -> float:
    a1, a2, a3 = 0.254829592, -0.284496736, 1.421413741
    a4, a5, p  = -1.453152027, 1.061405429, 0.3275911
    sign = -1 if x < 0 else 1
    x    = abs(x) / math.sqrt(2)
    t    = 1.0 / (1.0 + p * x)
    y    = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)
    return 0.5 * (1.0 + sign * y)


# == mean(arr) ==
def mean(arr: List[float]) -> float:
    if not arr:
        return 0
    return sum(arr) / len(arr)


# == stdDev(arr) — population std dev ==
def std_dev(arr: List[float]) -> float:
    if len(arr) < 2:
        return 0
    m = mean(arr)
    return math.sqrt(sum((v - m) ** 2 for v in arr) / len(arr))


# == significanceBadge(p) ==
def significance_badge(p: float) -> dict:
    if p < 0.001:
        return {"significant": True,  "confidence": 99.9, "label": "***"}
    if p < 0.01:
        return {"significant": True,  "confidence": 99,   "label": "**"}
    if p < 0.05:
        return {"significant": True,  "confidence": 95,   "label": "*"}
    return     {"significant": False, "confidence": None,  "label": "ns"}
