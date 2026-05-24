import { useReducer, useMemo } from 'react';
import type { PortfolioState, PortfolioAction, DisplayMode, PortfolioNode } from '../types';
import { buildComputedTree, annotateDrift } from '../utils/calculations';
import { addNode, deleteNode, toggleExpand, updateNode } from '../utils/treeUtils';

// Placeholder root used only when isInitialized is false — never displayed.
const BLANK_ROOT: PortfolioNode = {
  id: 'blank',
  name: 'Portfolio',
  relativePercent: 100,
  children: [],
  isExpanded: true,
};

function getInitialState(): PortfolioState {
  return {
    root: BLANK_ROOT,
    displayMode: 'relative' as DisplayMode,
    activeAddFormNodeId: null,
    tolerance: 5,
    cash: 0,
    isInitialized: false,
  };
}

function findPortfolioNode(root: PortfolioNode, id: string): PortfolioNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findPortfolioNode(child, id);
    if (found) return found;
  }
  return null;
}

function hasLeafData(node: PortfolioNode): boolean {
  if (node.currentValue !== undefined) return true;
  if (!node.metrics) return false;
  return Object.values(node.metrics).some(v => v !== undefined);
}

function reducer(state: PortfolioState, action: PortfolioAction): PortfolioState {
  switch (action.type) {
    case 'CREATE_PORTFOLIO':
      return {
        ...state,
        root: {
          id: crypto.randomUUID(),
          name: action.name,
          relativePercent: 100,
          children: [],
          isExpanded: true,
        },
        cash: 0,
        activeAddFormNodeId: null,
        isInitialized: true,
      };
    case 'ADD_NODE': {
      const newNode: PortfolioNode = {
        id: crypto.randomUUID(),
        name: action.name,
        relativePercent: action.percent,
        children: [],
        isExpanded: false,
      };

      const parent = findPortfolioNode(state.root, action.parentId);
      const selfClone: PortfolioNode | undefined =
        parent && parent.children.length === 0 && hasLeafData(parent)
          ? {
              id: crypto.randomUUID(),
              name: parent.name,
              description: parent.description,
              metrics: parent.metrics,
              currentValue: parent.currentValue,
              relativePercent: Math.max(0, 100 - action.percent),
              children: [],
              isExpanded: false,
            }
          : undefined;

      return {
        ...state,
        root: addNode(state.root, action.parentId, newNode, selfClone),
        activeAddFormNodeId: null,
      };
    }
    case 'DELETE_NODE':
      return { ...state, root: deleteNode(state.root, action.nodeId) };
    case 'TOGGLE_EXPAND':
      return { ...state, root: toggleExpand(state.root, action.nodeId) };
    case 'SET_DISPLAY_MODE':
      return { ...state, displayMode: action.mode };
    case 'SET_ACTIVE_ADD_FORM':
      return {
        ...state,
        activeAddFormNodeId:
          state.activeAddFormNodeId === action.nodeId ? null : action.nodeId,
      };
    case 'UPDATE_NODE':
      return { ...state, root: updateNode(state.root, action.nodeId, action.updates) };
    case 'SET_TOLERANCE':
      return { ...state, tolerance: action.tolerance };
    case 'SET_CASH':
      return { ...state, cash: action.value };
    case 'IMPORT_PORTFOLIO':
      return {
        ...state,
        root: action.root,
        tolerance: action.tolerance ?? state.tolerance,
        cash: action.cash ?? 0,
        activeAddFormNodeId: null,
        isInitialized: true,
      };
    default:
      return state;
  }
}

export function usePortfolio() {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);

  const computedRoot = useMemo(() => {
    const tree = buildComputedTree(state.root);
    return annotateDrift(tree, tree.aggregatedValue, state.tolerance);
  }, [state.root, state.tolerance]);

  return { state, dispatch, computedRoot };
}
