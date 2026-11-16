import { NextResponse } from 'next/server';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { buildLocalInterpretation } from './local-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ApiBody {
  chart: ZiweiChart;
  messages?: ApiMessage[];
}

function isValidChart(value: unknown): value is ZiweiChart {
  if (!value || typeof value !== 'object') return false;
  const chart = value as ZiweiChart;
  return Boolean(
    chart.birthInfo
      && chart.lunarInfo
      && Array.isArray(chart.palaces)
      && chart.palaces.length === 12
      && Number.isInteger(chart.mingGongBranch)
      && Number.isInteger(chart.shenGongBranch),
  );
}

function chunkText(text: string, size = 72) {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks.length ? chunks : [''];
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
  let body: ApiBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!isValidChart(body.chart)) {
    return NextResponse.json({ error: 'INVALID_CHART' }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const lastUser = [...messages].reverse().find(message => message?.role === 'user' && typeof message.content === 'string');
  const question = lastUser?.content?.slice(0, 1200) ?? '';
  const answer = buildLocalInterpretation(body.chart, question);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const chunk of chunkText(answer)) {
          if (request.signal.aborted) break;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: { text: chunk } })}\n\n`));
          await sleep(12);
        }
        if (!request.signal.aborted) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        }
      } catch (error) {
        console.error('[api/interpret] stream failed', error);
        if (!request.signal.aborted) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: { message: '解读生成失败' } })}\n\n`));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
