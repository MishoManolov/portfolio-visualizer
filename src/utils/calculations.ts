import type { PortfolioNode, ComputedNode, AggregatedMetrics } from '../types';

function buildAggregatedMetrics(node: PortfolioNode, children: ComputedNode[]): AggregatedMetrics {
  if (children.length === 0) {
    return {
      expectedReturn: node.metrics?.expectedReturn ?? null,
      volatility:     node.metrics?.volatility     ?? null,
      maxDrawdown:    node.metrics?.maxDrawdown     ?? null,
      isPartial:
        node.metrics?.expectedReturn == null ||
        node.metrics?.volatility     == null ||
        node.metrics?.maxDrawdown    == null,
    };
  }

  let returnSum = 0, returnWeightSum = 0;
  let volSum    = 0, volWeightSum    = 0;
  let ddSum     = 0, ddWeightSum     = 0;

  for (const child of children) {
    const w = child.relativePercent / 100;
    if (child.aggregatedMetrics.expectedReturn !== null) { returnSum += w * child.aggregatedMetrics.expectedReturn; returnWeightSum += w; }
    if (child.aggregatedMetrics.volatility     !== null) { volSum    += w * child.aggregatedMetrics.volatility;     volWeightSum    += w; }
    if (child.aggregatedMetrics.maxDrawdown    !== null) { ddSum     += w * child.aggregatedMetrics.maxDrawdown;    ddWeightSum     += w; }
  }

  const allReturn = children.every(c => c.aggregatedMetrics.expectedReturn !== null);
  const allVol    = children.every(c => c.aggregatedMetrics.volatility     !== null);
  const allDD     = children.every(c => c.aggregatedMetrics.maxDrawdown    !== null);

  return {
    expectedReturn: returnWeightSum > 0 ? returnSum / returnWeightSum : null,
    volatility:     volWeightSum    > 0 ? volSum    / volWeightSum    : null,
    maxDrawdown:    ddWeightSum     > 0 ? ddSum     / ddWeightSum     : null,
    isPartial: !allReturn || !allVol || !allDD,
  };
}

export function buildComputedTree(
  node: PortfolioNode,
  parentAbsolutePercent: number = 100,
  depth: number = 0
): ComputedNode {
  const absolutePercent = (node.relativePercent / 100) * parentAbsolutePercent;
  const childrenSum = node.children.reduce((sum, c) => sum + c.relativePercent, 0);
  const isValid = node.children.length === 0 || Math.abs(childrenSum - 100) < 0.001;

  const computedChildren = node.children.map((child) =>
    buildComputedTree(child, absolutePercent, depth + 1)
  );

  return {
    id: node.id,
    name: node.name,
    description: node.description,
    metrics: node.metrics,
    aggregatedMetrics: buildAggregatedMetrics(node, computedChildren),
    relativePercent: node.relativePercent,
    absolutePercent,
    childrenSum,
    isValid,
    depth,
    isExpanded: node.isExpanded,
    children: computedChildren,
  };
}

export function formatPercent(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, '') + '%';
}
