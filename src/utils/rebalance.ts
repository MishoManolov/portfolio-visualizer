import type { ComputedNode } from '../types';

export type OperationType = 'withdraw' | 'deposit';

export interface RebalanceOperation {
  type: OperationType;
  assetId: string;
  assetName: string;
  amount: number;          // absolute value, always positive
  portfolioPercent: number;
}

export type RebalanceStatus = 'no-values' | 'in-tolerance' | 'ok';

export interface RebalancePlan {
  status: RebalanceStatus;
  totalCapital: number;   // invested + cash (cash may be negative)
  trackedLeafCount: number;
  operations: RebalanceOperation[];
}

function collectLeaves(node: ComputedNode, out: ComputedNode[]) {
  if (node.children.length === 0) { out.push(node); return; }
  for (const child of node.children) collectLeaves(child, out);
}

/**
 * For each leaf, compute delta = actual − target where target is based on
 * totalCapital = invested + cash.
 *
 * cash > 0 → user wants to grow the portfolio (more capital to deploy)
 * cash < 0 → user wants to shrink the portfolio (capital to reclaim)
 * cash = 0 → pure rebalancing, portfolio size stays the same
 *
 * Overweight assets produce Withdraw operations; underweight assets produce
 * Deposit operations. Withdrawals are listed first (they replenish cash),
 * deposits second (they consume cash). Each operation has a Fulfill button
 * in the UI; deposits are disabled when current cash is insufficient.
 */
export function computeRebalancePlan(root: ComputedNode, tolerance: number, cash = 0): RebalancePlan {
  const investedValue = root.aggregatedValue;
  const totalCapital = investedValue + cash;

  const leaves: ComputedNode[] = [];
  collectLeaves(root, leaves);

  if (leaves.length === 0 || totalCapital <= 0) {
    return { status: 'no-values', totalCapital: 0, trackedLeafCount: 0, operations: [] };
  }

  const toleranceValue = (tolerance / 100) * Math.abs(totalCapital);

  const withdrawals: RebalanceOperation[] = [];
  const deposits: RebalanceOperation[] = [];

  for (const leaf of leaves) {
    const target = (leaf.absolutePercent / 100) * totalCapital;
    const actual = leaf.aggregatedValue;
    const delta = actual - target; // positive → overweight, negative → underweight

    if (delta > toleranceValue) {
      withdrawals.push({
        type: 'withdraw',
        assetId: leaf.id,
        assetName: leaf.name,
        amount: delta,
        portfolioPercent: (delta / Math.abs(totalCapital)) * 100,
      });
    } else if (delta < -toleranceValue) {
      deposits.push({
        type: 'deposit',
        assetId: leaf.id,
        assetName: leaf.name,
        amount: -delta,
        portfolioPercent: (-delta / Math.abs(totalCapital)) * 100,
      });
    }
  }

  if (withdrawals.length === 0 && deposits.length === 0) {
    return { status: 'in-tolerance', totalCapital, trackedLeafCount: leaves.length, operations: [] };
  }

  withdrawals.sort((a, b) => b.amount - a.amount);
  deposits.sort((a, b) => b.amount - a.amount);

  return {
    status: 'ok',
    totalCapital,
    trackedLeafCount: leaves.length,
    operations: [...withdrawals, ...deposits],
  };
}
