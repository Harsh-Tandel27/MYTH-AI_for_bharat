import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html } = await request.json();

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] No RESEND_API_KEY configured, simulating...');
      // Simulate success if no API key
      return NextResponse.json({
        success: true,
        simulated: true,
        output: {
          sent: true,
          to,
          subject,
          messageId: `sim_${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    console.log('[Email] Sending to:', to);
    console.log('[Email] Subject:', subject);

    // Convert markdown/plain text to HTML
    function convertToHtml(text: string): string {
      if (!text) return '';

      // If already HTML, return as-is
      if (text.includes('<p>') || text.includes('<div>') || text.includes('<br')) {
        return text;
      }

      // Convert markdown-style formatting
      let result = text
        // Convert **bold** to <strong>
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Convert *italic* to <em>
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Convert line breaks to <br>
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        // Wrap in paragraph tags
        ;

      return `<p>${result}</p>`;
    }

    // Convert content to HTML
    const htmlContent = convertToHtml(html || subject);

    // Professional email template
    const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📧 AgentAI</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    ${htmlContent}
  </div>
  <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
    Sent via AgentAI Workflow Automation
  </div>
</body>
</html>`;

    const { data, error } = await resend!.emails.send({
      from: 'AgentAI <onboarding@resend.dev>',
      to: [to],
      subject,
      html: emailTemplate,
    });

    if (error) {
      console.error('[Email] Resend error:', error);
      return NextResponse.json(
        {
          error: error.message,
          output: {
            sent: false,
            to,
            subject,
            error: error.message,
            timestamp: new Date().toISOString(),
          }
        },
        { status: 500 }
      );
    }

    console.log('[Email] Sent successfully:', data?.id);

    return NextResponse.json({
      success: true,
      output: {
        sent: true,
        to,
        subject,
        messageId: data?.id || `msg_${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[Email] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send email',
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
