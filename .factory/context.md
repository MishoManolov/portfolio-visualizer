# Project context

Purpose: a portfolio tree visualizer (React, Vite, TypeScript, managed with bun). CLAUDE.md describes the two node types (the stored PortfolioNode and the derived ComputedNode), the reducer in hooks/usePortfolio.ts and the tree utilities.

Checks the factory runs: the production build (`tsc -b && vite build`). There is no test suite yet, so a bug fix cannot be proved by a failing test first; the reviewer and the person merging are the main checks. `bun run lint` currently fails with 6 existing errors (for example updating a ref during render); fixing them is a good first task, after which lint can join the gates.

The backend/ folder is a separate Node server and is not covered, so it is off limits for now.

Definition of done: the build passes and behaviour described in README.md still holds.
