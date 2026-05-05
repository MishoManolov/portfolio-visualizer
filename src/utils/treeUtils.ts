import type { PortfolioNode } from '../types';

export function addNode(
  root: PortfolioNode,
  parentId: string,
  newNode: PortfolioNode
): PortfolioNode {
  if (root.id === parentId) {
    return { ...root, children: [...root.children, newNode], isExpanded: true };
  }
  return {
    ...root,
    children: root.children.map((child) => addNode(child, parentId, newNode)),
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
