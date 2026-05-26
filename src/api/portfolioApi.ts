import type { PortfolioNode } from '../types';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export interface PortfolioPayload {
  root: PortfolioNode;
  tolerance?: number;
  cash?: number;
  shareMode?: 'edit' | 'view' | null;
}

export async function loadPortfolioFromCloud(id: string): Promise<PortfolioPayload | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/portfolio/${id}`);
    if (!res.ok) return null;
    return await res.json() as PortfolioPayload;
  } catch {
    return null;
  }
}

export async function savePortfolioToCloud(id: string, data: Omit<PortfolioPayload, 'shareMode'>): Promise<void> {
  if (!API_URL) return;
  try {
    await fetch(`${API_URL}/api/portfolio/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // fire-and-forget — localStorage is the source of truth
  }
}

export async function createSnapshot(data: Omit<PortfolioPayload, 'shareMode'>): Promise<string | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    const json = await res.json() as { id: string };
    return json.id;
  } catch {
    return null;
  }
}

export async function deletePortfolioFromCloud(id: string): Promise<void> {
  if (!API_URL) return;
  try {
    await fetch(`${API_URL}/api/portfolio/${id}`, { method: 'DELETE' });
  } catch {
    // ignore
  }
}
