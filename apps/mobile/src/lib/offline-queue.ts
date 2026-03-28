import * as SecureStore from 'expo-secure-store';
import { api } from './api';

export interface OfflineMutation {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retries: number;
  errorMessage?: string;
}

const QUEUE_KEY = 'offline_mutation_queue';
const MAX_RETRIES = 3;

class OfflineMutationQueue {
  private queue: OfflineMutation[] = [];
  private isSyncing = false;
  private listeners: Set<() => void> = new Set();

  async load(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch {
      this.queue = [];
    }
  }

  private async persist(): Promise<void> {
    try {
      await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      // SecureStore may fail on some devices
    }
    this.notifyListeners();
  }

  async enqueue(mutation: Omit<OfflineMutation, 'id' | 'timestamp' | 'status' | 'retries'>): Promise<string> {
    const id = `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const entry: OfflineMutation = {
      ...mutation,
      id,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
    };
    this.queue.push(entry);
    await this.persist();
    return id;
  }

  async remove(id: string): Promise<void> {
    this.queue = this.queue.filter((m) => m.id !== id);
    await this.persist();
  }

  getPending(): OfflineMutation[] {
    return this.queue.filter((m) => m.status === 'pending' || m.status === 'failed');
  }

  getAll(): OfflineMutation[] {
    return [...this.queue];
  }

  get pendingCount(): number {
    return this.getPending().length;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }

  async sync(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    this.isSyncing = true;

    let synced = 0;
    let failed = 0;

    const pending = this.getPending();

    for (const mutation of pending) {
      mutation.status = 'syncing';
      await this.persist();

      try {
        const client = (api as any).client;
        switch (mutation.method) {
          case 'POST':
            await client.post(mutation.endpoint, mutation.body);
            break;
          case 'PATCH':
            await client.patch(mutation.endpoint, mutation.body);
            break;
          case 'PUT':
            await client.put(mutation.endpoint, mutation.body);
            break;
          case 'DELETE':
            await client.delete(mutation.endpoint);
            break;
        }

        await this.remove(mutation.id);
        synced++;
      } catch (error: any) {
        mutation.retries++;
        mutation.errorMessage = error.message || 'Unknown error';

        if (mutation.retries >= MAX_RETRIES) {
          mutation.status = 'failed';
        } else {
          mutation.status = 'pending';
        }
        await this.persist();
        failed++;
      }
    }

    this.isSyncing = false;
    return { synced, failed };
  }

  async clearFailed(): Promise<void> {
    this.queue = this.queue.filter((m) => m.status !== 'failed' || m.retries < MAX_RETRIES);
    await this.persist();
  }
}

export const offlineQueue = new OfflineMutationQueue();
