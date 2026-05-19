# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev      # start dev server (Vite)
bun run build    # type-check + production build
bun run lint     # ESLint
```

No test suite exists yet.

## Architecture

### Two node types
The codebase separates raw data from derived display data via two interfaces in `types.ts`:

- **`PortfolioNode`** — the serializable tree stored in state and localStorage. Contains `relativePercent`, optional `description`, optional `metrics` (expectedReturn, volatility, maxDrawdown).
- **`ComputedNode`** — produced on every render by `buildComputedTree` in `utils/calculations.ts`. Adds `absolutePercent` (cascaded from root down), `childrenSum`, `isValid`, `depth`, and `aggregatedMetrics` (weighted averages of performance metrics recursively up the tree). Never mutated; always re-derived.

### State management
`hooks/usePortfolio.ts` owns all state via `useReducer`. It:
- Loads initial state from `localStorage` (key `portfolio-visualizer-tree`), falling back to `data/initialData.ts`.
- Persists `state.root` to localStorage on every change.
- Exposes `computedRoot` (memoized `ComputedNode` tree) alongside `state` and `dispatch`.

Tree mutations (`ADD_NODE`, `DELETE_NODE`, `TOGGLE_EXPAND`, `UPDATE_NODE`) are handled by pure recursive functions in `utils/treeUtils.ts`. `UPDATE_NODE` merges the `metrics` field shallowly rather than replacing it.

### Performance metrics aggregation
`buildAggregatedMetrics` in `utils/calculations.ts` computes `AggregatedMetrics` at every node:
- **Leaf nodes**: own `metrics` (user-inputted).
- **Parent nodes**: weighted average of children's `aggregatedMetrics`, using `relativePercent/100` as weights, re-normalised to children that actually have data. Sets `isPartial = true` when some descendants are missing data.
- Derived ratios (Sharpe = return/volatility, Calmar = return/maxDrawdown) are computed in the SidePanel at render time, not stored.
- Volatility and max drawdown aggregation assumes full correlation (conservative upper bound, labelled in the UI).

### Tree layout and SVG connectors
`TreeNode` renders a **horizontal tree**: children spread left-to-right in a flex row 64px below the parent. Bezier connectors are drawn in a two-phase `useLayoutEffect` pattern:

1. **Phase 1** — measures whether children overflow the viewport width and computes an overlap amount. Overlapping children get a negative `marginLeft`.
2. **Phase 2** — reads DOM positions of parent card and each child card, then emits SVG cubic-bezier paths + endpoint dots.

`li.tree-node__item` has `pointer-events: none`; only `div.tree-node__self` restores `pointer-events: auto`. This prevents large invisible bounding boxes from intercepting clicks in blank space between cards.

When a node is focused, every ancestor in `highlightedPath` gets `tree-node__item--on-path` (z-index: 20), so the full selection path pops above sibling nodes. Hovering a card triggers `z-index: 30` via `:has(> .tree-node__self:hover)`, scoped so it only fires for the node's own card (not descendants).

### Side panel
`components/SidePanel/SidePanel.tsx` opens when a node is clicked (focused). It receives the `ComputedNode` and `dispatch`. Local state tracks in-progress edits; changes are saved on blur. The panel shows:
- Editable name, relative % (disabled for root), absolute % (read-only), depth.
- **Leaf nodes**: editable inputs for expected return, volatility, max drawdown; derived Sharpe and Calmar ratios displayed when both ingredients are present.
- **Parent nodes**: read-only aggregated metrics from children.
- Editable notes/description textarea.
- Clickable children list (navigates focus to child).
- Add-child form (reuses `AddNodeForm`), expand/collapse, delete.

### Validation
A node with children is marked `isValid = false` when its children's `relativePercent` values don't sum to exactly 100 (tolerance: 0.001). Invalid nodes render with a red border and a warning showing the actual sum.

### Float inputs
All numeric inputs use `type="text" inputMode="decimal"`. A `normalizeDecimal` helper (in `SidePanel.tsx` and `AddNodeForm.tsx`) replaces `,` with `.` before `parseFloat`, so both comma and dot work as decimal separators. Spinner arrows are suppressed globally in `styles/global.css`.

### Styling
All design tokens (colours, radii, shadows, spacing) are CSS custom properties defined in `src/styles/global.css`. Component styles are co-located as `ComponentName.css` files imported directly into the component.
