import { NextResponse } from 'next/server';
import WebSocket from 'ws';

// 임시 진단용 라우트. AISStream 연결/구독/수신 상태를 그대로 노출한다.
// 원인 파악 후 제거 예정.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const HORMUZ_BBOX = [[[24.5, 54.5], [27.5, 58.0]]];

export async function GET() {
  const apiKey = process.env.AISSTREAM_API_KEY;
  if (!apiKey) return NextResponse.json({ configured: false });

  const diag: {
    opened: boolean;
    apiKeyLen: number;
    messageCount: number;
    byType: Record<string, number>;
    samples: unknown[];
    rawError: unknown;
    errors: string[];
    close?: { code: number; reason: string };
  } = {
    opened: false,
    apiKeyLen: apiKey.length,
    messageCount: 0,
    byType: {},
    samples: [],
    rawError: null,
    errors: [],
  };

  await new Promise<void>((resolve) => {
    let ws: WebSocket | null = null;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        ws?.close();
      } catch {
        /* noop */
      }
      resolve();
    };
    const timer = setTimeout(finish, 15000);

    try {
      ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    } catch (e) {
      diag.errors.push('ctor:' + (e as Error).message);
      clearTimeout(timer);
      finish();
      return;
    }

    ws.on('open', () => {
      diag.opened = true;
      ws?.send(
        JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: HORMUZ_BBOX,
          FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
        })
      );
    });

    ws.on('message', (raw: WebSocket.RawData) => {
      diag.messageCount += 1;
      try {
        const m = JSON.parse(raw.toString()) as Record<string, unknown>;
        const t = (m.MessageType as string) || 'unknown';
        diag.byType[t] = (diag.byType[t] ?? 0) + 1;
        if (diag.samples.length < 2) diag.samples.push(m);
        if (m.error || m.Error || t.toLowerCase().includes('error')) {
          diag.rawError = m.error ?? m.Error ?? m;
        }
      } catch (e) {
        diag.errors.push('parse:' + (e as Error).message);
      }
    });

    ws.on('error', (e: Error) => {
      diag.errors.push('ws:' + (e?.message || String(e)));
      clearTimeout(timer);
      finish();
    });

    ws.on('close', (code: number, reason: Buffer) => {
      diag.close = { code, reason: reason?.toString() ?? '' };
    });
  });

  return NextResponse.json(diag);
}
