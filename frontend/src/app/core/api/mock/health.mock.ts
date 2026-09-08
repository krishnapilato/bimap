/**
 * Plausible runtime figures for the demo dashboard.
 *
 * The numbers drift on every poll — heap sawtooths as a collector runs, CPU wanders, request
 * counts only ever climb — because a dashboard whose gauges never move proves nothing. The shape
 * is identical to what `/api/platform/runtime` really returns.
 *
 * @author Khova Krishna Pilato
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { HealthApi } from '../adapters';
import { Memory, RuntimeSnapshot } from '../models';
import { respond } from './mock-store';

const STARTED_AT = Date.now() - 3 * 60 * 60 * 1000 - 42 * 60 * 1000;

interface ServiceState {
  requests: number;
  clientErrors: number;
  serverErrors: number;
  heapRatio: number;
}

@Injectable()
export class MockHealthAdapter implements HealthApi {
  readonly #state = new Map<string, ServiceState>([
    ['IAM Service', { requests: 18_432, clientErrors: 214, serverErrors: 3, heapRatio: 0.31 }],
    [
      'Business Core Service',
      { requests: 42_118, clientErrors: 96, serverErrors: 1, heapRatio: 0.44 },
    ],
  ]);

  snapshots(): Observable<readonly RuntimeSnapshot[]> {
    return respond([...this.#state.keys()].map((service) => this.#advance(service)));
  }

  #advance(service: string): RuntimeSnapshot {
    const state = this.#state.get(service)!;

    // Requests only climb; a counter that fell would be a bug, not a demo.
    state.requests += Math.floor(Math.random() * 40);
    if (Math.random() < 0.25) {
      state.clientErrors += 1;
    }

    // Heap sawtooths: it creeps up, then a collection drops it back.
    state.heapRatio += Math.random() * 0.05;
    if (state.heapRatio > 0.78) {
      state.heapRatio = 0.22 + Math.random() * 0.1;
    }

    const isIam = service.startsWith('IAM');
    const maxHeap = 6_341_787_646;
    const uptimeSeconds = Math.floor((Date.now() - STARTED_AT) / 1000);

    return {
      service,
      version: '2.0.0',
      status: 'UP',
      components: [
        { name: 'db', status: 'UP' },
        { name: 'diskSpace', status: 'UP' },
        { name: 'livenessState', status: 'UP' },
        { name: 'ping', status: 'UP' },
        { name: 'readinessState', status: 'UP' },
        ...(isIam ? [{ name: 'mail', status: 'UP' }] : [{ name: 'ssl', status: 'UP' }]),
      ],
      profiles: ['demo'],
      runtime: {
        java: '26.0.2',
        jvm: 'OpenJDK 64-Bit Server VM 26.0.2+10-55',
        os: 'Linux 6.8.0',
        architecture: 'amd64',
        port: isIam ? 9843 : 9844,
      },
      uptime: { seconds: uptimeSeconds, display: humanDuration(uptimeSeconds) },
      heap: memory(Math.round(maxHeap * state.heapRatio), maxHeap),
      nonHeap: memory(148_000_000 + Math.round(Math.random() * 6_000_000), 1_124_073_471),
      cpu: {
        process: round(0.02 + Math.random() * 0.16, 4),
        system: round(0.18 + Math.random() * 0.22, 4),
        cores: 12,
      },
      threads: {
        live: 22 + Math.floor(Math.random() * 8),
        daemon: 18 + Math.floor(Math.random() * 4),
        peak: 41,
      },
      http: {
        requests: state.requests,
        averageMillis: round(38 + Math.random() * 24, 2),
        slowestMillis: round(680 + Math.random() * 220, 2),
        clientErrors: state.clientErrors,
        serverErrors: state.serverErrors,
      },
      database: {
        active: Math.floor(Math.random() * 4),
        idle: 2 + Math.floor(Math.random() * 3),
        max: 10,
        pending: 0,
      },
      startedAt: new Date(STARTED_AT).toISOString(),
      sampledAt: new Date().toISOString(),
    };
  }
}

function memory(used: number, max: number): Memory {
  return {
    used,
    committed: Math.round(used * 1.45),
    max,
    usedRatio: round(used / max, 4),
    display: `${humanBytes(used)} / ${humanBytes(max)}`,
    usedDisplay: humanBytes(used),
    maxDisplay: humanBytes(max),
  };
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function humanBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return value >= 100 || unit === 0
    ? `${Math.round(value)} ${UNITS[unit]}`
    : `${value.toFixed(1)} ${UNITS[unit]}`;
}

export function humanDuration(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
