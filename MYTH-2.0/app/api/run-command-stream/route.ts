import { NextRequest, NextResponse } from 'next/server';

// Get active sandbox from global state
declare global {
  var activeSandbox: any;
}

export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json();
    
    if (!command) {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }
    
    if (!global.activeSandbox) {
      return NextResponse.json({ error: 'No active sandbox' }, { status: 400 });
    }
    
    console.log(`[run-command-stream] Executing: ${command}`);
    
    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Execute the command in the sandbox
          const result = await global.activeSandbox.runCode(`
import subprocess
import os
import sys

os.chdir('/home/user/app')

# Run the command
process = subprocess.Popen(
    ${JSON.stringify(command)},
    shell=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

stdout, stderr = process.communicate(timeout=60)

if stdout:
    print("STDOUT_START")
    print(stdout)
    print("STDOUT_END")
    
if stderr:
    print("STDERR_START")
    print(stderr)
    print("STDERR_END")

print(f"EXIT_CODE:{process.returncode}")
          `);
          
          // Parse and stream the output
          const output = result.logs.stdout.join('\n');
          
          // Parse stdout
          const stdoutMatch = output.match(/STDOUT_START\n([\s\S]*?)\nSTDOUT_END/);
          if (stdoutMatch && stdoutMatch[1]) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'stdout', content: stdoutMatch[1] })}\n\n`
            ));
          }
          
          // Parse stderr
          const stderrMatch = output.match(/STDERR_START\n([\s\S]*?)\nSTDERR_END/);
          if (stderrMatch && stderrMatch[1]) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'stderr', content: stderrMatch[1] })}\n\n`
            ));
          }
          
          // Parse exit code
          const exitCodeMatch = output.match(/EXIT_CODE:(\d+)/);
          const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1]) : 0;
          
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'complete', exitCode })}\n\n`
          ));
          
        } catch (error: any) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`
          ));
        }
        
        controller.close();
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('[run-command-stream] Error:', error);
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
