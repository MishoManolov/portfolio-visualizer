import type { ComputedNode, DisplayMode } from '../types';

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
 * Compute the per-leaf drift threshold in absolute dollar terms.
 *
 * Absolute mode: tolerance % of total capital — every asset gets the same
 * dollar band, so a 5 % tolerance means ±$500 on a $10,000 portfolio regardless
 * of the asset's target size.
 *
 * Relative mode: tolerance % of the asset's own target value — a 5 % tolerance
 * on a $1,000 target allows ±$50 drift, while a $100 target only allows ±$5.
 * This keeps proportionally smaller assets tighter, reflecting that a 5 % swing
 * in a small position is still a 5 % swing relative to that position.
 */
function leafThreshold(
  target: number,
  totalCapital: number,
  toleranceFraction: number,
  displayMode: DisplayMode,
): number {
  if (displayMode === 'relative') {
    return toleranceFraction * Math.abs(target);
  }
  return toleranceFraction * Math.abs(totalCapital);
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
 * deposits second (they consume cash).
 *
 * Tolerance interpretation:
 *   absolute mode — uniform band: same ±% of total capital for every asset
 *   relative mode — proportional band: ±% of each asset's own target value
 *
 * Conservation guarantee: sum(all_deltas) = −cash.
 * Mandatory withdrawals alone may not fund all deposits when within-tolerance
 * overweight assets are excluded. We close the gap with supplementary Withdraw
 * operations (capped to the exact gap amount) so every deposit can be fulfilled
 * and cash reaches zero after all operations.
 */
export function computeRebalancePlan(
  root: ComputedNode,
  tolerance: number,
  cash = 0,
  displayMode: DisplayMode = 'absolute',
): RebalancePlan {
  const investedValue = root.aggregatedValue;
  const totalCapital = investedValue + cash;

  const leaves: ComputedNode[] = [];
  collectLeaves(root, leaves);

  if (leaves.length === 0 || totalCapital <= 0) {
    return { status: 'no-values', totalCapital: 0, trackedLeafCount: 0, operations: [] };
  }

  const toleranceFraction = tolerance / 100;

  const withdrawals: RebalanceOperation[] = [];
  const deposits: RebalanceOperation[] = [];
  // Overweight assets within their tolerance band: 0 < delta ≤ threshold
  const withinToleranceOverweights: Array<{ leaf: ComputedNode; delta: number }> = [];

  for (const leaf of leaves) {
    const target = (leaf.absolutePercent / 100) * totalCapital;
    const actual = leaf.aggregatedValue;
    const delta = actual - target; // positive → overweight, negative → underweight

    const threshold = leafThreshold(target, totalCapital, toleranceFraction, displayMode);

    if (delta > threshold) {
      withdrawals.push({
        type: 'withdraw',
        assetId: leaf.id,
        assetName: leaf.name,
        amount: delta,
        portfolioPercent: (delta / Math.abs(totalCapital)) * 100,
      });
    } else if (delta < -threshold) {
      deposits.push({
        type: 'deposit',
        assetId: leaf.id,
        assetName: leaf.name,
        amount: -delta,
        portfolioPercent: (-delta / Math.abs(totalCapital)) * 100,
      });
    } else if (delta > 0.005) {
      withinToleranceOverweights.push({ leaf, delta });
    }
  }

  if (withdrawals.length === 0 && deposits.length === 0) {
    return { status: 'in-tolerance', totalCapital, trackedLeafCount: leaves.length, operations: [] };
  }

  // Close the funding gap: deposits may exceed cash + mandatory withdrawals when
  // small overweight assets were excluded by their tolerance band. Add supplementary
  // withdrawals from within-tolerance overweight assets to cover the exact gap.
  const totalDeposits = deposits.reduce((s, o) => s + o.amount, 0);
  const totalMandatoryWithdrawals = withdrawals.reduce((s, o) => s + o.amount, 0);
  let gap = totalDeposits - (cash + totalMandatoryWithdrawals);

  if (gap > 0.005 && withinToleranceOverweights.length > 0) {
    withinToleranceOverweights.sort((a, b) => b.delta - a.delta);
    for (const { leaf, delta } of withinToleranceOverweights) {
      if (gap <= 0.005) break;
      const amount = Math.min(delta, gap);
      withdrawals.push({
        type: 'withdraw',
        assetId: leaf.id,
        assetName: leaf.name,
        amount,
        portfolioPercent: (amount / Math.abs(totalCapital)) * 100,
      });
      gap -= amount;
    }
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
