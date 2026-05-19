import { useState, useMemo } from 'react';
import { usePortfolio } from './hooks/usePortfolio';
import { Header } from './components/Header/Header';
import { TreeView } from './components/TreeView/TreeView';
import { SidePanel } from './components/SidePanel/SidePanel';
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

function App() {
  const { state, dispatch, computedRoot } = usePortfolio();
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  const highlightedPath = useMemo(
    () => focusedNodeId ? getPathToNode(computedRoot, focusedNodeId) : new Set<string>(),
    [focusedNodeId, computedRoot],
  );

  const focusedNode = useMemo(
    () => focusedNodeId ? findNode(computedRoot, focusedNodeId) : null,
    [focusedNodeId, computedRoot],
  );

  function handleToggleMode() {
    dispatch({
      type: 'SET_DISPLAY_MODE',
      mode: state.displayMode === 'relative' ? 'absolute' : 'relative',
    });
  }

  return (
    <>
      <Header
        displayMode={state.displayMode}
        onToggleMode={handleToggleMode}
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
        />
        {focusedNode && (
          <SidePanel
            node={focusedNode}
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
