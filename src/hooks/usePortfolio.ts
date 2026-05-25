import { useReducer, useMemo, useEffect } from 'react';
import type { PortfolioState, PortfolioAction, DisplayMode, PortfolioNode } from '../types';
import { buildComputedTree, annotateDrift } from '../utils/calculations';
import { addNode, deleteNode, toggleExpand, updateNode } from '../utils/treeUtils';
import { savePortfolioToCloud, deletePortfolioFromCloud } from '../api/portfolioApi';

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

// Placeholder root used only when isInitialized is false — never displayed.
const BLANK_ROOT: PortfolioNode = {
  id: 'blank',
  name: 'Portfolio',
  relativePercent: 100,
  children: [],
  isExpanded: true,
};

function getInitialState(): PortfolioState {
  const saved = loadFromStorage();
  return {
    root: saved?.root ?? BLANK_ROOT,
    displayMode: 'relative' as DisplayMode,
    activeAddFormNodeId: null,
    tolerance: saved?.tolerance ?? 5,
    cash: saved?.cash ?? 0,
    isInitialized: saved !== null,
    isSharedView: false,
    sharedViewMode: null,
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
    case 'LOAD_SHARED_PORTFOLIO':
      return {
        ...state,
        root: action.root,
        tolerance: action.tolerance ?? 5,
        cash: action.cash ?? 0,
        activeAddFormNodeId: null,
        isInitialized: true,
        isSharedView: true,
        sharedViewMode: action.shareMode,
      };
    case 'RESET_PORTFOLIO':
      deletePortfolioFromCloud(state.root.id);
      localStorage.removeItem(STORAGE_KEY);
      return {
        root: BLANK_ROOT,
        displayMode: 'relative' as DisplayMode,
        activeAddFormNodeId: null,
        tolerance: 5,
        cash: 0,
        isInitialized: false,
        isSharedView: false,
        sharedViewMode: null,
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

  useEffect(() => {
    if (!state.isInitialized) return;
    const payload = { root: state.root, tolerance: state.tolerance, cash: state.cash };
    if (!state.isSharedView) {
      // Normal portfolio: persist locally and to cloud
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
      savePortfolioToCloud(state.root.id, payload);
    } else if (state.sharedViewMode === 'edit') {
      // Shared editable view: sync changes to cloud only, leave visitor's localStorage untouched
      savePortfolioToCloud(state.root.id, payload);
    }
  }, [state.root, state.tolerance, state.cash, state.isInitialized, state.isSharedView, state.sharedViewMode]);

  return { state, dispatch, computedRoot };
}
