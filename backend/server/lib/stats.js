// server/lib/stats.js — shared statistical functions for all Phase 2 tabs

function pearsonR(x, y) {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const num  = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
  const denX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
  const denY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));
  if (denX === 0 || denY === 0) return 0;
  return parseFloat((num / (denX * denY)).toFixed(4));
}

function pearsonPValue(r, n) {
  if (n < 3) return 1;
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const p = 2 * (1 - normalCDF(Math.abs(t)));
  return parseFloat(p.toFixed(4));
}

function correlationStrength(r) {
  const abs = Math.abs(r);
  if (abs >= 0.5) return r > 0 ? 'Strong +'  : 'Strong -';
  if (abs >= 0.2) return r > 0 ? 'Moderate +' : 'Moderate -';
  return 'No Correlation';
}

function correlationCategory(r) {
  if (r >= 0.5)             return 'strong_positive';
  if (r >= 0.2)             return 'moderate_positive';
  if (r > -0.2 && r < 0.2) return 'weak_none';
  if (r >= -0.5)            return 'moderate_negative';
  return 'strong_negative';
}

function twoSampleZTest(meanA, meanB, stdA, stdB, nA, nB) {
  const se = Math.sqrt((stdA * stdA / nA) + (stdB * stdB / nB));
  if (se === 0) return { z: 0, p: 1, significant: false };
  const z = parseFloat(((meanA - meanB) / se).toFixed(4));
  const p = parseFloat((2 * (1 - normalCDF(Math.abs(z)))).toFixed(4));
  return { z, p, significant: p < 0.05 };
}

function oneSampleZTest(sampleMean, popMean, stdDev, n) {
  const se = stdDev / Math.sqrt(n);
  if (se === 0) return { z: 0, p: 1, significant: false };
  const z          = parseFloat(((sampleMean - popMean) / se).toFixed(4));
  const pOneTailed = parseFloat((1 - normalCDF(z)).toFixed(4));
  const pTwoTailed = parseFloat((2 * (1 - normalCDF(Math.abs(z)))).toFixed(4));
  return {
    z,
    p_one_tailed: pOneTailed,
    p_two_tailed: pTwoTailed,
    critical_z_05: 1.645,
    significant: pOneTailed < 0.05,
    decision: pOneTailed < 0.05 ? 'Reject H₀' : 'Fail to reject H₀'
  };
}

function normalCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / arr.length);
}

function significanceBadge(p) {
  if (p < 0.001) return { significant: true, confidence: 99.9, label: '***' };
  if (p < 0.01)  return { significant: true, confidence: 99,   label: '**' };
  if (p < 0.05)  return { significant: true, confidence: 95,   label: '*' };
  return { significant: false, confidence: null, label: 'ns' };
}

module.exports = {
  pearsonR, pearsonPValue, correlationStrength, correlationCategory,
  twoSampleZTest, oneSampleZTest, normalCDF, mean, stdDev, significanceBadge
};
