import type { ComputedNode } from '../types';

export interface RebalanceTransaction {
  fromName: string;
  toName: string;
  amount: number;
  portfolioPercent: number;
}

export type RebalanceStatus =
  | 'no-values'       // total portfolio value is zero — nothing to rebalance
  | 'in-tolerance'    // all assets within tolerance
  | 'ok'              // drifted assets found, plan generated

export interface RebalancePlan {
  status: RebalanceStatus;
  totalValue: number;
  trackedLeafCount: number;
  transactions: RebalanceTransaction[];
}

function collectLeaves(node: ComputedNode, out: ComputedNode[]) {
  if (node.children.length === 0) { out.push(node); return; }
  for (const child of node.children) collectLeaves(child, out);
}

/**
 * Greedy minimum-transaction rebalancing.
 *
 * For each tracked leaf: compute delta = actual − target.
 * Sort overweight assets (delta > 0) and underweight assets (delta < 0).
 * Repeatedly pair the most overweight seller with the most underweight buyer,
 * transferring min(seller_remaining, buyer_need). This exhausts at least one
 * party per step, yielding at most (sellers + buyers − 1) transactions total.
 *
 * We target the exact allocation value, which always lands within tolerance.
 */
export function computeRebalancePlan(root: ComputedNode, tolerance: number): RebalancePlan {
  const totalValue = root.aggregatedValue;

  const leaves: ComputedNode[] = [];
  collectLeaves(root, leaves);

  // totalValue is zero only when no leaf has any currentValue set
  if (leaves.length === 0 || totalValue <= 0) {
    return { status: 'no-values', totalValue: 0, trackedLeafCount: 0, transactions: [] };
  }

  const toleranceValue = (tolerance / 100) * totalValue;

  // Untracked leaves have aggregatedValue = 0, so they appear underweight and
  // naturally receive funds in the plan — no special-casing needed.
  const items = leaves.map(leaf => ({
    name: leaf.name,
    target: (leaf.absolutePercent / 100) * totalValue,
    actual: leaf.aggregatedValue,
    remaining: leaf.aggregatedValue - (leaf.absolutePercent / 100) * totalValue,
  }));

  const anyDrifted = items.some(i => Math.abs(i.remaining) > toleranceValue);

  if (!anyDrifted) {
    return { status: 'in-tolerance', totalValue, trackedLeafCount: leaves.length, transactions: [] };
  }

  const sellers = items.filter(i => i.remaining >  0.005).sort((a, b) => b.remaining - a.remaining);
  const buyers  = items.filter(i => i.remaining < -0.005).sort((a, b) => a.remaining - b.remaining);

  const transactions: RebalanceTransaction[] = [];
  let si = 0, bi = 0;

  while (si < sellers.length && bi < buyers.length) {
    const seller = sellers[si];
    const buyer  = buyers[bi];
    const amount = Math.min(seller.remaining, -buyer.remaining);

    if (amount >= 0.005) {
      transactions.push({
        fromName: seller.name,
        toName: buyer.name,
        amount,
        portfolioPercent: (amount / totalValue) * 100,
      });
    }

    seller.remaining -= amount;
    buyer.remaining  += amount;

    if (seller.remaining < 0.005) si++;
    if (-buyer.remaining < 0.005) bi++;
  }

  return { status: 'ok', totalValue, trackedLeafCount: leaves.length, transactions };
}
