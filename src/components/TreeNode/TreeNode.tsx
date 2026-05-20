import { useRef, useState, useLayoutEffect } from 'react';
import type { ComputedNode, DisplayMode, PortfolioAction } from '../../types';
import { NodeCard } from '../NodeCard/NodeCard';
import { AddNodeForm } from '../AddNodeForm/AddNodeForm';
import './TreeNode.css';

interface TreeNodeProps {
  node: ComputedNode;
  displayMode: DisplayMode;
  activeAddFormNodeId: string | null;
  dispatch: React.Dispatch<PortfolioAction>;
  isRoot?: boolean;
  overlapMarginLeft?: number;
  focusedNodeId: string | null;
  onFocusNode: (id: string | null) => void;
  highlightedPath: Set<string>;
  visibleBranchIds: Set<string>;
  zoom: number;
}

interface Connector {
  childId: string;
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
  activeAddFormNodeId,
  dispatch,
  isRoot = false,
  overlapMarginLeft,
  focusedNodeId,
  onFocusNode,
  highlightedPath,
  visibleBranchIds,
  zoom,
}: TreeNodeProps) {
  const isAddFormOpen = activeAddFormNodeId === node.id;
  const hasExpandedChildren = node.children.length > 0 && node.isExpanded;
  const isFocused = node.id === focusedNodeId;
  const isOnPath = highlightedPath.has(node.id);
  const isDimmed = focusedNodeId !== null && !visibleBranchIds.has(node.id);

  const containerRef = useRef<HTMLLIElement>(null);
  const selfRef = useRef<HTMLDivElement>(null);
  const childrenListRef = useRef<HTMLUListElement>(null);
  const [overlapPx, setOverlapPx] = useState(0);
  const [svgData, setSvgData] = useState<SvgData | null>(null);

  // ── Phase 1: compute overlap ───────────────────────────────────
  useLayoutEffect(() => {
    if (!hasExpandedChildren) { setOverlapPx(0); return; }
    const ul = childrenListRef.current;
    if (!ul) return;

    let lastOverlap = 0;

    const measure = () => {
      const items = Array.from(ul.children) as HTMLElement[];
      if (items.length <= 1) {
        if (lastOverlap !== 0) { lastOverlap = 0; setOverlapPx(0); }
        return;
      }
      const allLeaves = items.every(
        li => li.querySelector(':scope > .tree-node__children') === null
      );
      const avgCardWidth = items.reduce((sum, li) => {
        const card = li.querySelector(':scope > .tree-node__self > .node-card') as HTMLElement | null;
        return sum + (card ? card.offsetWidth : li.offsetWidth);
      }, 0) / items.length;
      const next = allLeaves ? avgCardWidth * 0.5 : 0;
      if (Math.abs(next - lastOverlap) > 0.5) {
        lastOverlap = next;
        setOverlapPx(next);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ul);
    let rafId = 0;
    const onResize = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(measure); };
    window.addEventListener('resize', onResize);
    return () => { ro.disconnect(); window.removeEventListener('resize', onResize); cancelAnimationFrame(rafId); };
  }, [hasExpandedChildren, node.children.length]);

  // ── Phase 2: SVG bezier paths (after overlap settles) ─────────
  useLayoutEffect(() => {
    if (!hasExpandedChildren) { setSvgData(null); return; }

    const buildPaths = () => {
      const container = containerRef.current;
      const selfEl = selfRef.current;
      const ul = childrenListRef.current;
      if (!container || !selfEl || !ul) return;

      const parentCard = selfEl.querySelector(':scope > .node-card') as HTMLElement | null;
      if (!parentCard) return;

      // getBoundingClientRect returns viewport-scaled coords (includes CSS zoom on
      // ancestor ul). Divide differences by zoom to get the SVG's own layout coords.
      const cRect = container.getBoundingClientRect();
      const pRect = parentCard.getBoundingClientRect();
      const originX = (pRect.left + pRect.width / 2 - cRect.left) / zoom;
      const originY = (pRect.bottom - cRect.top) / zoom;

      const connectors: Connector[] = [];
      for (const li of Array.from(ul.children) as HTMLElement[]) {
        const childId = li.dataset.nodeId ?? '';
        const childCard = li.querySelector(':scope > .tree-node__self > .node-card') as HTMLElement | null;
        if (!childCard) continue;
        const r = childCard.getBoundingClientRect();
        const toX = (r.left + r.width / 2 - cRect.left) / zoom;
        const toY = (r.top - cRect.top) / zoom;
        const span = (toY - originY) * 0.48;
        connectors.push({
          childId,
          path: `M ${originX} ${originY} C ${originX} ${originY + span}, ${toX} ${toY - span}, ${toX} ${toY}`,
          dotX: toX,
          dotY: toY,
        });
      }

      setSvgData({ originX, originY, connectors });
    };

    buildPaths();
    const ro = new ResizeObserver(buildPaths);
    if (selfRef.current) ro.observe(selfRef.current);
    if (childrenListRef.current) ro.observe(childrenListRef.current);
    // Use rAF so we measure after the browser has finished reflowing on resize.
    let rafId = 0;
    const onResize = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(buildPaths); };
    window.addEventListener('resize', onResize);
    return () => { ro.disconnect(); window.removeEventListener('resize', onResize); cancelAnimationFrame(rafId); };
  }, [hasExpandedChildren, node.children.length, overlapPx, zoom]);

  // ── Handlers ──────────────────────────────────────────────────
  function handleToggleExpand() { dispatch({ type: 'TOGGLE_EXPAND', nodeId: node.id }); }
  function handleAddSubmit(name: string, percent: number) {
    dispatch({ type: 'ADD_NODE', parentId: node.id, name, percent });
  }
  function handleAddCancel() { dispatch({ type: 'SET_ACTIVE_ADD_FORM', nodeId: null }); }
  function handleFocus() { onFocusNode(isFocused ? null : node.id); }

  // ── Item style ────────────────────────────────────────────────
  const itemStyle: React.CSSProperties = {};
  if (overlapMarginLeft !== undefined) itemStyle.marginLeft = `${overlapMarginLeft}px`;

  // ── SVG connector colours ──────────────────────────────────────
  const isActive = focusedNodeId !== null;
  const originHighlighted = isActive && svgData?.connectors.some(c => highlightedPath.has(c.childId));

  function connectorStroke(childId: string) {
    if (!isActive) return 'var(--color-connector)';
    if (highlightedPath.has(childId)) return 'var(--color-connector-highlight)';
    if (visibleBranchIds.has(childId)) return 'var(--color-connector)';
    return 'var(--color-connector-dimmed)';
  }
  function connectorWidth(childId: string) {
    return isActive && highlightedPath.has(childId) ? '2' : '1.5';
  }
  function dotFill(childId: string) {
    return connectorStroke(childId);
  }
  function dotRadius(childId: string) {
    return isActive && highlightedPath.has(childId) ? 4 : 3;
  }

  return (
    <li
      ref={containerRef}
      className={`tree-node__item${isFocused ? ' tree-node__item--focused' : ''}${isOnPath ? ' tree-node__item--on-path' : ''}${isDimmed ? ' tree-node__item--dimmed' : ''}`}
      data-node-id={node.id}
      style={Object.keys(itemStyle).length > 0 ? itemStyle : undefined}
    >
      <div ref={selfRef} className="tree-node__self">
        <NodeCard
          node={node}
          displayMode={displayMode}
          isRoot={isRoot}
          isOverlapFocused={isFocused}
          onToggleExpand={handleToggleExpand}
          onUpdateValue={node.children.length === 0
            ? (v) => dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { currentValue: v } })
            : undefined}
          onCardBodyClick={handleFocus}
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
          {svgData && (
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
              {svgData.connectors.map((c) => (
                <g key={c.childId}>
                  <path
                    d={c.path}
                    stroke={connectorStroke(c.childId)}
                    strokeWidth={connectorWidth(c.childId)}
                    fill="none"
                    strokeLinecap="round"
                    style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                  />
                  <circle
                    cx={c.dotX}
                    cy={c.dotY}
                    r={dotRadius(c.childId)}
                    fill={dotFill(c.childId)}
                    style={{ transition: 'fill 0.2s, r 0.2s' }}
                  />
                </g>
              ))}
              <circle
                cx={svgData.originX}
                cy={svgData.originY}
                r={originHighlighted ? 4 : 3}
                fill={originHighlighted ? 'var(--color-connector-highlight)' : isActive && !visibleBranchIds.has(node.id) ? 'var(--color-connector-dimmed)' : 'var(--color-connector)'}
                style={{ transition: 'fill 0.2s, r 0.2s' }}
              />
            </svg>
          )}
          <ul ref={childrenListRef} className="tree-node__children">
            {node.children.map((child, index) => (
              <TreeNode
                key={child.id}
                node={child}
                displayMode={displayMode}
                activeAddFormNodeId={activeAddFormNodeId}
                dispatch={dispatch}
                overlapMarginLeft={overlapPx > 0 && index > 0 ? -overlapPx : undefined}
                focusedNodeId={focusedNodeId}
                onFocusNode={onFocusNode}
                highlightedPath={highlightedPath}
                visibleBranchIds={visibleBranchIds}
                zoom={zoom}
              />
            ))}
          </ul>
        </>
      )}
    </li>
  );
}
