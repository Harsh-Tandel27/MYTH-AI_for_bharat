import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Workflow from '@/lib/models/workflow.model';
import { WorkflowRunner } from '@/app/agentai/lib/workflow-runner';
import { type LogEntry } from '@/app/agentai/lib/execution-engine';

export const dynamic = 'force-dynamic';

// POST - Trigger workflow execution via webhook
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await params;
  const executionLogs: LogEntry[] = [];
  
  try {
    // Parse incoming webhook data
    let webhookData: Record<string, unknown> = {};
    try {
      webhookData = await request.json();
    } catch {
      // No body or invalid JSON - that's okay
    }

    // Get query params
    const query: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    // Get headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (!key.startsWith('x-') && !key.startsWith('sec-')) {
        headers[key] = value;
      }
    });

    console.log(`[Webhook] Received request for workflow: ${workflowId}`);
    console.log(`[Webhook] Body:`, webhookData);

    // Connect to MongoDB and lookup workflow
    await connectMongoDB();
    const workflow = await Workflow.findById(workflowId);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const { nodes, edges } = workflow.flowData;

    if (!nodes || nodes.length === 0) {
      return NextResponse.json(
        { error: 'Workflow has no nodes' },
        { status: 400 }
      );
    }

    // Create initial trigger context from webhook data
    const initialContext = {
      trigger: {
        body: webhookData,
        query,
        headers,
        method: request.method,
        timestamp: new Date().toISOString(),
      },
    };

    console.log(`[Webhook] Starting execution with ${nodes.length} nodes`);

    // Get base URL from request for server-side API calls
    const baseUrl = request.nextUrl.origin;
    console.log(`[Webhook] Using base URL: ${baseUrl}`);

    // Create runner with initial context and base URL
    const runner = new WorkflowRunner(nodes, edges, {
      onLog: (log) => executionLogs.push(log),
      onNodeStateChange: () => {},
      onContextUpdate: () => {},
    }, baseUrl);

    // Inject initial trigger data
    (runner as any).context = initialContext;

    // Execute workflow
    const result = await runner.run();

    console.log(`[Webhook] Execution complete: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    return NextResponse.json({
      success: result.success,
      workflowId,
      workflowName: workflow.name,
      executedAt: new Date().toISOString(),
      context: result.context,
      logs: executionLogs.map((log) => ({
        type: log.type,
        message: log.message,
        timestamp: log.timestamp,
      })),
    });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Webhook execution failed',
        logs: executionLogs,
      },
      { status: 500 }
    );
  }
}

// GET - Return webhook info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await params;
  
  try {
    await connectMongoDB();
    const workflow = await Workflow.findById(workflowId);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      workflowId,
      workflowName: workflow.name,
      webhookUrl: `${request.nextUrl.origin}/api/v1/webhooks/${workflowId}`,
      method: 'POST',
      hint: 'Send a POST request with JSON body to trigger this workflow',
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get webhook info' },
      { status: 500 }
    );
  }
}
