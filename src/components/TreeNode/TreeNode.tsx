import { useRef, useState, useLayoutEffect, useEffect } from 'react';
import type { ComputedNode, DisplayMode, LayoutMode, PortfolioAction } from '../../types';
import { NodeCard } from '../NodeCard/NodeCard';
import { AddNodeForm } from '../AddNodeForm/AddNodeForm';
import './TreeNode.css';

interface TreeNodeProps {
  node: ComputedNode;
  displayMode: DisplayMode;
  layoutMode: LayoutMode;
  activeAddFormNodeId: string | null;
  dispatch: React.Dispatch<PortfolioAction>;
  isRoot?: boolean;
  overlapMarginLeft?: number;
  isFocusedSibling?: boolean;
  onFocusThis?: () => void;
}

interface Connector {
  path: string;
  dotX: number;
  dotY: number;
}

interface SvgData {
  originX: number;
  originY: number;
  connectors: Connector[];
}

export function TreeNode({
  node,
  displayMode,
  layoutMode,
  activeAddFormNodeId,
  dispatch,
  isRoot = false,
  overlapMarginLeft,
  isFocusedSibling = false,
  onFocusThis,
}: TreeNodeProps) {
  const isAddFormOpen = activeAddFormNodeId === node.id;
  const isHorizontal = layoutMode === 'horizontal';
  const hasExpandedChildren = node.children.length > 0 && node.isExpanded;

  const containerRef = useRef<HTMLLIElement>(null);
  const selfRef = useRef<HTMLDivElement>(null);
  const childrenListRef = useRef<HTMLUListElement>(null);
  const [overlapPx, setOverlapPx] = useState(0);
  const [focusedChildId, setFocusedChildId] = useState<string | null>(null);
  const [svgData, setSvgData] = useState<SvgData | null>(null);

  // ── Phase 1: compute overlap ───────────────────────────────────
  useLayoutEffect(() => {
    if (!isHorizontal || !hasExpandedChildren) {
      setOverlapPx(0);
      return;
    }
    const ul = childrenListRef.current;
    if (!ul) return;

    const measure = () => {
      const items = Array.from(ul.children) as HTMLElement[];
      if (items.length <= 1) { setOverlapPx(0); return; }

      const totalNatural = items.reduce((sum, c) => sum + c.offsetWidth, 0);
      const gap = parseFloat(getComputedStyle(ul).gap) || 8;
      const totalWithGaps = totalNatural + gap * (items.length - 1);
      const scrollContainer = ul.closest('.tree-view') as HTMLElement | null;
      const available = scrollContainer
        ? scrollContainer.clientWidth
        : document.documentElement.clientWidth - 48;

      if (totalWithGaps > available) {
        setOverlapPx((totalWithGaps - available) / (items.length - 1));
      } else {
        setOverlapPx(0);
      }
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isHorizontal, hasExpandedChildren, node.children.length]);

  // ── Phase 2: build SVG bezier paths (after overlap layout settles) ──
  useLayoutEffect(() => {
    if (!isHorizontal || !hasExpandedChildren) {
      setSvgData(null);
      return;
    }

    const buildPaths = () => {
      const container = containerRef.current;
      const selfEl = selfRef.current;
      const ul = childrenListRef.current;
      if (!container || !selfEl || !ul) return;

      const parentCard = selfEl.querySelector(':scope > .node-card') as HTMLElement | null;
      if (!parentCard) return;

      const cRect = container.getBoundingClientRect();
      const pRect = parentCard.getBoundingClientRect();
      const originX = pRect.left + pRect.width / 2 - cRect.left;
      const originY = pRect.bottom - cRect.top;

      const connectors: Connector[] = [];
      for (const li of Array.from(ul.children) as HTMLElement[]) {
        const childCard = li.querySelector(':scope > .tree-node__self > .node-card') as HTMLElement | null;
        if (!childCard) continue;
        const r = childCard.getBoundingClientRect();
        const toX = r.left + r.width / 2 - cRect.left;
        const toY = r.top - cRect.top;
        const span = (toY - originY) * 0.48;
        connectors.push({
          path: `M ${originX} ${originY} C ${originX} ${originY + span}, ${toX} ${toY - span}, ${toX} ${toY}`,
          dotX: toX,
          dotY: toY,
        });
      }

      setSvgData({ originX, originY, connectors });
    };

    buildPaths();
    window.addEventListener('resize', buildPaths);
    return () => window.removeEventListener('resize', buildPaths);
  }, [isHorizontal, hasExpandedChildren, node.children.length, overlapPx]);

  // Clear focus when child set changes
  useEffect(() => {
    setFocusedChildId(null);
  }, [node.id, node.children.length]);

  // ── Handlers ──────────────────────────────────────────────────
  function handleToggleExpand() { dispatch({ type: 'TOGGLE_EXPAND', nodeId: node.id }); }
  function handleAddChild() { dispatch({ type: 'SET_ACTIVE_ADD_FORM', nodeId: node.id }); }
  function handleDelete() { dispatch({ type: 'DELETE_NODE', nodeId: node.id }); }
  function handleAddSubmit(name: string, percent: number) {
    dispatch({ type: 'ADD_NODE', parentId: node.id, name, percent });
  }
  function handleAddCancel() { dispatch({ type: 'SET_ACTIVE_ADD_FORM', nodeId: null }); }

  // ── Item inline style ─────────────────────────────────────────
  const itemStyle: React.CSSProperties = {};
  if (overlapMarginLeft !== undefined) itemStyle.marginLeft = `${overlapMarginLeft}px`;
  if (isFocusedSibling) { itemStyle.zIndex = 20; itemStyle.position = 'relative'; }

  return (
    <li
      ref={containerRef}
      className={`tree-node__item ${isHorizontal ? 'tree-node__item--h' : ''}`}
      style={Object.keys(itemStyle).length > 0 ? itemStyle : undefined}
    >
      <div ref={selfRef} className="tree-node__self">
        <NodeCard
          node={node}
          displayMode={displayMode}
          isRoot={isRoot}
          isAddFormOpen={isAddFormOpen}
          isOverlapFocused={isFocusedSibling}
          onToggleExpand={handleToggleExpand}
          onAddChild={handleAddChild}
          onDelete={handleDelete}
          onCardBodyClick={onFocusThis}
        />
        {isAddFormOpen && (
          <AddNodeForm
            parentId={node.id}
            existingChildrenSum={node.childrenSum}
            onSubmit={handleAddSubmit}
            onCancel={handleAddCancel}
          />
        )}
      </div>

      {hasExpandedChildren && (
        <>
          {isHorizontal && svgData && (
            <svg
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                overflow: 'visible',
                pointerEvents: 'none',
              }}
            >
              {svgData.connectors.map((c, i) => (
                <g key={i}>
                  <path
                    d={c.path}
                    stroke="var(--color-connector)"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <circle cx={c.dotX} cy={c.dotY} r={3} fill="var(--color-connector)" />
                </g>
              ))}
              <circle cx={svgData.originX} cy={svgData.originY} r={3} fill="var(--color-connector)" />
            </svg>
          )}
          <ul
            ref={childrenListRef}
            className={`tree-node__children ${isHorizontal ? 'tree-node__children--h' : ''}`}
          >
            {node.children.map((child, index) => {
              const isThisFocused = child.id === focusedChildId;
              const applyOverlap = isHorizontal && overlapPx > 0 && index > 0 && !isThisFocused;
              return (
                <TreeNode
                  key={child.id}
                  node={child}
                  displayMode={displayMode}
                  layoutMode={layoutMode}
                  activeAddFormNodeId={activeAddFormNodeId}
                  dispatch={dispatch}
                  overlapMarginLeft={applyOverlap ? -overlapPx : undefined}
                  isFocusedSibling={isHorizontal && isThisFocused}
                  onFocusThis={isHorizontal
                    ? () => setFocusedChildId(focusedChildId === child.id ? null : child.id)
                    : undefined}
                />
              );
            })}
          </ul>
        </>
      )}
    </li>
  );
}
