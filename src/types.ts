export interface PortfolioNode {
  id: string;
  name: string;
  relativePercent: number;
  children: PortfolioNode[];
  isExpanded: boolean;
}

export interface ComputedNode {
  id: string;
  name: string;
  relativePercent: number;
  absolutePercent: number;
  childrenSum: number;
  isValid: boolean;
  depth: number;
  children: ComputedNode[];
  isExpanded: boolean;
}

export type DisplayMode = 'relative' | 'absolute';
export type LayoutMode = 'vertical' | 'horizontal';

export interface PortfolioState {
  root: PortfolioNode;
  displayMode: DisplayMode;
  layoutMode: LayoutMode;
  activeAddFormNodeId: string | null;
}

export type PortfolioAction =
  | { type: 'ADD_NODE'; parentId: string; name: string; percent: number }
  | { type: 'DELETE_NODE'; nodeId: string }
  | { type: 'TOGGLE_EXPAND'; nodeId: string }
  | { type: 'SET_DISPLAY_MODE'; mode: DisplayMode }
  | { type: 'SET_LAYOUT_MODE'; mode: LayoutMode }
  | { type: 'SET_ACTIVE_ADD_FORM'; nodeId: string | null };
