import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { channel, message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn('[Slack] No SLACK_WEBHOOK_URL configured, simulating...');
      // Simulate success if no webhook URL
      return NextResponse.json({
        success: true,
        simulated: true,
        output: {
          sent: true,
          channel: channel || '#general',
          messageTs: `sim_${Date.now()}.000001`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    console.log('[Slack] Sending to channel:', channel || 'default');
    console.log('[Slack] Message:', message.substring(0, 100));

    // Send to Slack webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: channel || undefined,
        text: message,
        username: 'AgentAI Workflow',
        icon_emoji: ':robot_face:',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Slack] Webhook error:', errorText);
      return NextResponse.json(
        { 
          error: `Slack webhook failed: ${errorText}`,
          output: {
            sent: false,
            channel: channel || '#general',
            error: errorText,
            timestamp: new Date().toISOString(),
          }
        },
        { status: 500 }
      );
    }

    console.log('[Slack] Message sent successfully');

    return NextResponse.json({
      success: true,
      output: {
        sent: true,
        channel: channel || '#general',
        messageTs: `${Date.now()}.000001`,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[Slack] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to send Slack message',
        output: {
          sent: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      },
      { status: 500 }
    );
  }
}
