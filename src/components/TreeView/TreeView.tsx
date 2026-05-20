import type { ComputedNode, DisplayMode, PortfolioAction } from '../../types';
import { TreeNode } from '../TreeNode/TreeNode';
import './TreeView.css';

interface TreeViewProps {
  root: ComputedNode;
  displayMode: DisplayMode;
  activeAddFormNodeId: string | null;
  dispatch: React.Dispatch<PortfolioAction>;
  focusedNodeId: string | null;
  onFocusNode: (id: string | null) => void;
  highlightedPath: Set<string>;
  visibleBranchIds: Set<string>;
}

export function TreeView({
  root, displayMode, activeAddFormNodeId, dispatch,
  focusedNodeId, onFocusNode, highlightedPath, visibleBranchIds,
}: TreeViewProps) {
  return (
    <div className="tree-view">
      <ul className="tree-view__root">
        <TreeNode
          node={root}
          displayMode={displayMode}
          activeAddFormNodeId={activeAddFormNodeId}
          dispatch={dispatch}
          focusedNodeId={focusedNodeId}
          onFocusNode={onFocusNode}
          highlightedPath={highlightedPath}
          visibleBranchIds={visibleBranchIds}
          isRoot
        />
      </ul>
    </div>
  );
}
