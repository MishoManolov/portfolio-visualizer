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

  let aggregatedValue: number;
  let hasAnyValue: boolean;
  let isValuePartial: boolean;

  if (computedChildren.length === 0) {
    aggregatedValue = node.currentValue ?? 0;
    hasAnyValue = node.currentValue !== undefined;
    isValuePartial = node.currentValue === undefined;
  } else {
    aggregatedValue = computedChildren.reduce((sum, c) => sum + c.aggregatedValue, 0);
    hasAnyValue = computedChildren.some(c => c.hasAnyValue);
    isValuePartial = computedChildren.some(c => c.isValuePartial);
  }

  return {
    id: node.id,
    name: node.name,
    description: node.description,
    metrics: node.metrics,
    currentValue: node.currentValue,
    aggregatedValue,
    hasAnyValue,
    isValuePartial,
    valueIsTracked: false,
    actualAbsolutePercent: null,
    actualRelativePercent: null,
    absoluteDrift: null,
    relativeDrift: null,
    isAbsoluteDrifted: false,
    isRelativeDrifted: false,
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

export function annotateDrift(
  node: ComputedNode,
  totalValue: number,
  tolerance: number,
  parentAggregatedValue: number = 0,
): ComputedNode {
  const hasValues = totalValue > 0;

  const actualAbsolutePercent = hasValues
    ? (node.aggregatedValue / totalValue) * 100
    : null;

  const actualRelativePercent = parentAggregatedValue > 0
    ? (node.aggregatedValue / parentAggregatedValue) * 100
    : (node.depth === 0 && hasValues ? 100 : null);

  const absoluteDrift = actualAbsolutePercent !== null
    ? Math.abs(actualAbsolutePercent - node.absolutePercent)
    : null;
  const relativeDrift = actualRelativePercent !== null
    ? Math.abs(actualRelativePercent - node.relativePercent)
    : null;
  const isAbsoluteDrifted = absoluteDrift !== null && absoluteDrift > tolerance;
  const isRelativeDrifted = relativeDrift !== null && relativeDrift > tolerance;

  return {
    ...node,
    valueIsTracked: hasValues,
    actualAbsolutePercent,
    actualRelativePercent,
    absoluteDrift,
    relativeDrift,
    isAbsoluteDrifted,
    isRelativeDrifted,
    children: node.children.map(c =>
      annotateDrift(c, totalValue, tolerance, node.aggregatedValue)
    ),
  };
}

export function formatPercent(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, '') + '%';
}

export function formatValue(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
