import type { ComputedNode, DisplayMode, LayoutMode, PortfolioAction } from '../../types';
import { TreeNode } from '../TreeNode/TreeNode';
import './TreeView.css';

interface TreeViewProps {
  root: ComputedNode;
  displayMode: DisplayMode;
  layoutMode: LayoutMode;
  activeAddFormNodeId: string | null;
  dispatch: React.Dispatch<PortfolioAction>;
}

export function TreeView({ root, displayMode, layoutMode, activeAddFormNodeId, dispatch }: TreeViewProps) {
  return (
    <div className="tree-view" data-layout={layoutMode}>
      <ul className="tree-view__root">
        <TreeNode
          node={root}
          displayMode={displayMode}
          layoutMode={layoutMode}
          activeAddFormNodeId={activeAddFormNodeId}
          dispatch={dispatch}
          isRoot
        />
      </ul>
    </div>
  );
}
