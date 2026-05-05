import { useReducer, useMemo, useEffect } from 'react';
import type { PortfolioState, PortfolioAction, DisplayMode } from '../types';
import { initialData } from '../data/initialData';
import { buildComputedTree } from '../utils/calculations';
import { addNode, deleteNode, toggleExpand } from '../utils/treeUtils';

const STORAGE_KEY = 'portfolio-visualizer-tree';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to initialData
  }
  return null;
}

function getInitialState(): PortfolioState {
  const saved = loadFromStorage();
  return {
    root: saved ?? initialData,
    displayMode: 'relative' as DisplayMode,
    activeAddFormNodeId: null,
  };
}

function reducer(state: PortfolioState, action: PortfolioAction): PortfolioState {
  switch (action.type) {
    case 'ADD_NODE':
      return {
        ...state,
        root: addNode(state.root, action.parentId, {
          id: crypto.randomUUID(),
          name: action.name,
          relativePercent: action.percent,
          children: [],
          isExpanded: false,
        }),
        activeAddFormNodeId: null,
      };
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
    default:
      return state;
  }
}

export function usePortfolio() {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);

  const computedRoot = useMemo(() => buildComputedTree(state.root), [state.root]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.root));
    } catch {
      // quota exceeded or private browsing — ignore
    }
  }, [state.root]);

  return { state, dispatch, computedRoot };
}
