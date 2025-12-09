// Shared scoring utilities used by Dashboard and Marketplace.

// Pick an "effective" annual return for a product, preferring 5Y over 1Y.
export function pickAnnualReturn(product) {
  const r5 = product?.returns?.['5y'];
  const r1 = product?.returns?.['1y'];
  if (typeof r5 === 'number') return r5;
  if (typeof r1 === 'number') return r1;
  return 3; // conservative fallback when data missing
}

// Compute a simple score that balances return, fees and distance to ideal risk.
export function scoreProduct(product, profile) {
  const annual = pickAnnualReturn(product);
  const fee = typeof product?.fees === 'number' ? product.fees : 1;
  const riskScore = typeof product?.riskScore === 'number' ? product.riskScore : 4;

  const idealRisk =
    profile.riskTolerance === 'Conservative'
      ? 2
      : profile.riskTolerance === 'Balanced'
        ? 4
        : profile.riskTolerance === 'Growth'
          ? 5
          : 6;

  return {
    product,
    annual,
    score: annual - fee * 2 - Math.abs(riskScore - idealRisk),
  };
}



