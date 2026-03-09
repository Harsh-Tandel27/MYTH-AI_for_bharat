import { NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';

declare global {
  var activeSandbox: any;
  var sandboxData: any;
  var existingFiles: Set<string>;
}

export async function GET() {
  try {
    let sandboxExists = !!global.activeSandbox;
    let sandboxHealthy = false;
    let sandboxInfo = null;

    if (sandboxExists && global.activeSandbox) {
      // Verify the sandbox is actually alive by running a simple command
      try {
        await global.activeSandbox.runCode('print("ok")');
        sandboxHealthy = true;
        sandboxInfo = {
          sandboxId: global.sandboxData?.sandboxId,
          url: global.sandboxData?.url,
          filesTracked: global.existingFiles ? Array.from(global.existingFiles) : [],
          lastHealthCheck: new Date().toISOString()
        };
      } catch (error) {
        console.warn('[sandbox-status] Sandbox exists in memory but failed health check:', error);

        // Try to reconnect using the stored sandboxId
        const sandboxId = global.sandboxData?.sandboxId;
        if (sandboxId) {
          try {
            console.log(`[sandbox-status] Attempting reconnect to sandbox ${sandboxId}...`);
            const reconnected = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });
            global.activeSandbox = reconnected;

            // Verify reconnection with a simple health check
            await reconnected.runCode('print("reconnected")');
            sandboxHealthy = true;
            sandboxInfo = {
              sandboxId,
              url: global.sandboxData?.url,
              filesTracked: global.existingFiles ? Array.from(global.existingFiles) : [],
              lastHealthCheck: new Date().toISOString(),
              reconnected: true
            };
            console.log(`[sandbox-status] Successfully reconnected to sandbox ${sandboxId}`);
          } catch (reconnectError) {
            console.error('[sandbox-status] Reconnect failed, sandbox is dead:', reconnectError);
            // Sandbox is truly dead — clean up
            global.activeSandbox = null;
            global.sandboxData = null;
            sandboxExists = false;
            sandboxHealthy = false;
          }
        } else {
          // No sandbox ID to reconnect with — clean up
          global.activeSandbox = null;
          sandboxExists = false;
        }
      }
    }

    return NextResponse.json({
      success: true,
      active: sandboxExists,
      healthy: sandboxHealthy,
      sandboxData: sandboxInfo,
      message: sandboxHealthy
        ? 'Sandbox is active and healthy'
        : sandboxExists
          ? 'Sandbox exists but is not responding'
          : 'No active sandbox'
    });

  } catch (error) {
    console.error('[sandbox-status] Error:', error);
    return NextResponse.json({
      success: false,
      active: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}