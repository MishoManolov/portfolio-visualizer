import type { PortfolioNode } from '../types';

export function addNode(
  root: PortfolioNode,
  parentId: string,
  newNode: PortfolioNode,
  // When a data-bearing leaf gains its first child, a self-clone carrying the
  // leaf's metrics/value is inserted alongside the new child so nothing is lost.
  selfClone?: PortfolioNode,
): PortfolioNode {
  if (root.id === parentId) {
    if (selfClone) {
      return {
        ...root,
        description: undefined,
        metrics: undefined,
        currentValue: undefined,
        children: [selfClone, newNode],
        isExpanded: true,
      };
    }
    return { ...root, children: [...root.children, newNode], isExpanded: true };
  }
  return {
    ...root,
    children: root.children.map((child) => addNode(child, parentId, newNode, selfClone)),
  };
}

export function deleteNode(root: PortfolioNode, targetId: string): PortfolioNode {
  return {
    ...root,
    children: root.children
      .filter((child) => child.id !== targetId)
      .map((child) => deleteNode(child, targetId)),
  };
}

export function toggleExpand(root: PortfolioNode, targetId: string): PortfolioNode {
  if (root.id === targetId) {
    return { ...root, isExpanded: !root.isExpanded };
  }
  return {
    ...root,
    children: root.children.map((child) => toggleExpand(child, targetId)),
  };
}

export function updateNode(
  root: PortfolioNode,
  targetId: string,
  updates: { name?: string; description?: string; relativePercent?: number; currentValue?: number; metrics?: Partial<{ expectedReturn?: number; volatility?: number }> },
): PortfolioNode {
  if (root.id === targetId) {
    const { metrics, ...rest } = updates;
    return {
      ...root,
      ...rest,
      ...(metrics !== undefined ? { metrics: { ...root.metrics, ...metrics } } : {}),
    };
  }
  return { ...root, children: root.children.map((child) => updateNode(child, targetId, updates)) };
}
