import type { PortfolioNode, ComputedNode } from '../types';

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
