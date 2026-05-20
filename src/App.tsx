import { useState, useMemo } from 'react';
import { usePortfolio } from './hooks/usePortfolio';
import { Header } from './components/Header/Header';
import { TreeView } from './components/TreeView/TreeView';
import { SidePanel } from './components/SidePanel/SidePanel';
import { WelcomePage } from './components/WelcomePage/WelcomePage';
import type { ComputedNode } from './types';

function getPathToNode(root: ComputedNode, targetId: string): Set<string> {
  const path: string[] = [];
  function walk(node: ComputedNode): boolean {
    path.push(node.id);
    if (node.id === targetId) return true;
    for (const child of node.children) {
      if (walk(child)) return true;
    }
    path.pop();
    return false;
  }
  walk(root);
  return new Set(path);
}

function findNode(root: ComputedNode, id: string): ComputedNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function findParent(root: ComputedNode, id: string): ComputedNode | null {
  for (const child of root.children) {
    if (child.id === id) return root;
    const found = findParent(child, id);
    if (found) return found;
  }
  return null;
}

function collectDescendantIds(node: ComputedNode, out: Set<string>) {
  out.add(node.id);
  for (const child of node.children) collectDescendantIds(child, out);
}

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;
function clampZoom(z: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

function App() {
  const { state, dispatch, computedRoot } = usePortfolio();
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const highlightedPath = useMemo(
    () => focusedNodeId ? getPathToNode(computedRoot, focusedNodeId) : new Set<string>(),
    [focusedNodeId, computedRoot],
  );

  const focusedNode = useMemo(
    () => focusedNodeId ? findNode(computedRoot, focusedNodeId) : null,
    [focusedNodeId, computedRoot],
  );

  const parentNode = useMemo(
    () => focusedNodeId ? findParent(computedRoot, focusedNodeId) : null,
    [focusedNodeId, computedRoot],
  );

  const visibleBranchIds = useMemo(() => {
    if (!focusedNodeId || !focusedNode) return new Set<string>();
    const ids = new Set(highlightedPath);
    collectDescendantIds(focusedNode, ids);
    return ids;
  }, [focusedNodeId, focusedNode, highlightedPath]);

  function handleToggleMode() {
    dispatch({
      type: 'SET_DISPLAY_MODE',
      mode: state.displayMode === 'relative' ? 'absolute' : 'relative',
    });
  }

  function handleSetTolerance(t: number) {
    dispatch({ type: 'SET_TOLERANCE', tolerance: t });
  }
  function handleSetCash(v: number) {
    dispatch({ type: 'SET_CASH', value: v });
  }

  if (!state.isInitialized) {
    return <WelcomePage dispatch={dispatch} />;
  }

  return (
    <>
      <Header
        displayMode={state.displayMode}
        onToggleMode={handleToggleMode}
        tolerance={state.tolerance}
        onSetTolerance={handleSetTolerance}
        cash={state.cash}
        onSetCash={handleSetCash}
        computedRoot={computedRoot}
        portfolioRoot={state.root}
        dispatch={dispatch}
      />
      <main>
        <TreeView
          root={computedRoot}
          displayMode={state.displayMode}
          activeAddFormNodeId={state.activeAddFormNodeId}
          dispatch={dispatch}
          focusedNodeId={focusedNodeId}
          onFocusNode={setFocusedNodeId}
          highlightedPath={highlightedPath}
          visibleBranchIds={visibleBranchIds}
          zoom={zoom}
          onZoom={setZoom}
        />
        <div className="zoom-controls">
          <button
            className="zoom-controls__btn"
            onClick={() => setZoom(z => clampZoom(z - ZOOM_STEP))}
            disabled={zoom <= ZOOM_MIN}
            aria-label="Zoom out"
          >−</button>
          <span className="zoom-controls__label" onClick={() => setZoom(1)} title="Reset zoom">
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="zoom-controls__btn"
            onClick={() => setZoom(z => clampZoom(z + ZOOM_STEP))}
            disabled={zoom >= ZOOM_MAX}
            aria-label="Zoom in"
          >+</button>
        </div>
        {focusedNode && (
          <SidePanel
            node={focusedNode}
            parentNode={parentNode}
            displayMode={state.displayMode}
            dispatch={dispatch}
            onClose={() => setFocusedNodeId(null)}
            onNavigate={setFocusedNodeId}
          />
        )}
      </main>
    </>
  );
}

export default App;
