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

- **`PortfolioNode`** — the serializable tree stored in state and localStorage. Contains only `relativePercent` (% within its parent).
- **`ComputedNode`** — produced on every render by `buildComputedTree` in `utils/calculations.ts`. Adds `absolutePercent` (cascaded from the root down), `childrenSum`, `isValid`, and `depth`. Never mutated; always re-derived from `PortfolioNode`.

### State management
`hooks/usePortfolio.ts` owns all state via `useReducer`. It:
- Loads initial state from `localStorage` (key `portfolio-visualizer-tree`), falling back to `data/initialData.ts`.
- Persists `state.root` to localStorage on every change.
- Exposes `computedRoot` (memoized `ComputedNode` tree) alongside `state` and `dispatch`.

Tree mutations (`ADD_NODE`, `DELETE_NODE`, `TOGGLE_EXPAND`) are handled by pure recursive functions in `utils/treeUtils.ts` that return new `PortfolioNode` trees.

### Tree layout and SVG connectors
`TreeNode` renders a **horizontal tree**: children spread left-to-right in a flex row 64px below the parent. Bezier connectors are drawn in a two-phase `useLayoutEffect` pattern:

1. **Phase 1** — measures whether children overflow the viewport width and computes an overlap amount. Overlapping children get a negative `marginLeft`.
2. **Phase 2** — reads DOM positions of parent card and each child card, then emits SVG cubic-bezier paths + endpoint dots.

When children overlap, clicking a card "focuses" it (raises its `z-index` to 20) and highlights the path from root to that node via `highlightedPath` (a `Set<string>` of ancestor IDs computed in `App.tsx`). Connector colours switch between `--color-connector`, `--color-connector-highlight`, and `--color-connector-dimmed`.

### Validation
A node with children is marked `isValid = false` when its children's `relativePercent` values don't sum to exactly 100 (tolerance: 0.001). Invalid nodes render with a red border and a warning showing the actual sum.

### Styling
All design tokens (colours, radii, shadows, spacing) are CSS custom properties defined in `src/styles/global.css`. Component styles are co-located as `ComponentName.css` files imported directly into the component.
