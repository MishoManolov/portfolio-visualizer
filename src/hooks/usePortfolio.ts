import { useReducer, useMemo, useEffect } from 'react';
import type { PortfolioState, PortfolioAction, DisplayMode, PortfolioNode } from '../types';
import { initialData } from '../data/initialData';
import { buildComputedTree, annotateDrift } from '../utils/calculations';
import { addNode, deleteNode, toggleExpand, updateNode } from '../utils/treeUtils';

const STORAGE_KEY = 'portfolio-visualizer-tree';

interface PersistedState {
  root: PortfolioNode;
  tolerance?: number;
  cash?: number;
}

function loadFromStorage(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Old format: just a PortfolioNode (has 'id' at top level)
    if (parsed && typeof parsed === 'object' && 'id' in parsed) {
      return { root: parsed };
    }
    return parsed as PersistedState;
  } catch {
    return null;
  }
}

function getInitialState(): PortfolioState {
  const saved = loadFromStorage();
  return {
    root: saved?.root ?? initialData,
    displayMode: 'relative' as DisplayMode,
    activeAddFormNodeId: null,
    tolerance: saved?.tolerance ?? 5,
    cash: saved?.cash ?? 0,
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        root: state.root,
        tolerance: state.tolerance,
        cash: state.cash,
      }));
    } catch {
      // quota exceeded or private browsing — ignore
    }
  }, [state.root, state.tolerance, state.cash]);

  return { state, dispatch, computedRoot };
}
