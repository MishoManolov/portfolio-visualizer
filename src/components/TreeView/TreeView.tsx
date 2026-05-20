import { useState, useRef, useEffect } from 'react';
import type { ComputedNode, DisplayMode, PortfolioAction } from '../../types';
import { TreeNode } from '../TreeNode/TreeNode';
import './TreeView.css';

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
function clampZoom(z: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

interface TreeViewProps {
  root: ComputedNode;
  displayMode: DisplayMode;
  activeAddFormNodeId: string | null;
  dispatch: React.Dispatch<PortfolioAction>;
  focusedNodeId: string | null;
  onFocusNode: (id: string | null) => void;
  highlightedPath: Set<string>;
  visibleBranchIds: Set<string>;
  zoom: number;
  onZoom: (zoom: number) => void;
}

export function TreeView({
  root, displayMode, activeAddFormNodeId, dispatch,
  focusedNodeId, onFocusNode, highlightedPath, visibleBranchIds, zoom, onZoom,
}: TreeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const hasDragged = useRef(false);

  // Non-passive wheel: ctrl+scroll → zoom-to-cursor, plain scroll → pan
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        const rect = el.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const oldZoom = zoomRef.current;
        const newZoom = clampZoom(oldZoom - e.deltaY * 0.001);
        if (newZoom === oldZoom) return;
        const ratio = newZoom / oldZoom;
        onZoom(newZoom);
        setPan(p => ({
          x: cx - cx * ratio + p.x * ratio,
          y: cy - cy * ratio + p.y * ratio,
        }));
      } else {
        setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onZoom]);

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    // Don't hijack clicks on interactive elements inside the canvas
    if ((e.target as HTMLElement).closest('.node-card, button, input, textarea')) return;
    hasDragged.current = false;
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, panX: pan.x, panY: pan.y };
    containerRef.current?.focus();
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStart.current.mouseX;
    const dy = e.clientY - dragStart.current.mouseY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged.current = true;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  }

  function handleMouseUp() {
    isDraggingRef.current = false;
    setIsDragging(false);
  }

  function handleClick() {
    if (!hasDragged.current) onFocusNode(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const step = 80;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft:  [ step,    0],
      ArrowRight: [-step,    0],
      ArrowUp:    [    0,  step],
      ArrowDown:  [    0, -step],
    };
    const delta = deltas[e.key];
    if (!delta) return;
    e.preventDefault();
    setPan(p => ({ x: p.x + delta[0], y: p.y + delta[1] }));
  }

  return (
    <div
      ref={containerRef}
      className={`tree-view${isDragging ? ' tree-view--dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        className="tree-view__canvas"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
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
            zoom={zoom}
            isRoot
          />
        </ul>
      </div>
    </div>
  );
}
