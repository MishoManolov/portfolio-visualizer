export interface NodeMetrics {
  expectedReturn?: number;  // % per year
  volatility?: number;      // % per year (annual std dev)
  maxDrawdown?: number;     // % positive magnitude (e.g. 20 means −20%)
}

export interface AggregatedMetrics {
  expectedReturn: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  isPartial: boolean;  // true when some descendants are missing data
}

export interface PortfolioNode {
  id: string;
  name: string;
  description?: string;
  metrics?: NodeMetrics;
  currentValue?: number;
  relativePercent: number;
  children: PortfolioNode[];
  isExpanded: boolean;
}

export interface ComputedNode {
  id: string;
  name: string;
  description?: string;
  metrics?: NodeMetrics;
  currentValue?: number;
  aggregatedValue: number;
  hasAnyValue: boolean;
  valueIsTracked: boolean;
  isValuePartial: boolean;
  actualAbsolutePercent: number | null;
  actualRelativePercent: number | null;
  absoluteDrift: number | null;
  relativeDrift: number | null;
  isAbsoluteDrifted: boolean;
  isRelativeDrifted: boolean;
  aggregatedMetrics: AggregatedMetrics;
  relativePercent: number;
  absolutePercent: number;
  childrenSum: number;
  isValid: boolean;
  depth: number;
  children: ComputedNode[];
  isExpanded: boolean;
}

export type DisplayMode = 'relative' | 'absolute';

export interface PortfolioState {
  root: PortfolioNode;
  displayMode: DisplayMode;
  activeAddFormNodeId: string | null;
  tolerance: number;
}

export type PortfolioAction =
  | { type: 'ADD_NODE'; parentId: string; name: string; percent: number }
  | { type: 'DELETE_NODE'; nodeId: string }
  | { type: 'TOGGLE_EXPAND'; nodeId: string }
  | { type: 'SET_DISPLAY_MODE'; mode: DisplayMode }
  | { type: 'SET_ACTIVE_ADD_FORM'; nodeId: string | null }
  | { type: 'UPDATE_NODE'; nodeId: string; updates: { name?: string; description?: string; relativePercent?: number; currentValue?: number; metrics?: Partial<NodeMetrics> } }
  | { type: 'SET_TOLERANCE'; tolerance: number };
