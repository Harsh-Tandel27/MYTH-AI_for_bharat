import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';

// POST /api/check-vite-errors
// Connects to a sandbox, runs a Vite build check, and returns any compilation errors
export async function POST(req: NextRequest) {
  try {
    const { sandboxId } = await req.json();

    if (!sandboxId) {
      return NextResponse.json({ error: 'Sandbox ID is required' }, { status: 400 });
    }

    console.log(`[check-vite-errors] Connecting to sandbox: ${sandboxId}`);
    const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });

    // Run vite build in --mode development to catch compilation/syntax errors
    // We use a Python subprocess to capture both stdout and stderr
    const result = await sandbox.runCode(`
import subprocess
import os
import json

os.chdir('/home/user/app')

# Run vite build to check for compilation errors
process = subprocess.run(
    ['npx', 'vite', 'build', '--mode', 'development'],
    capture_output=True,
    text=True,
    timeout=30,
    env={**os.environ, 'FORCE_COLOR': '0', 'CI': 'true'}
)

output = {
    "exitCode": process.returncode,
    "stdout": process.stdout[-3000:] if len(process.stdout) > 3000 else process.stdout,
    "stderr": process.stderr[-3000:] if len(process.stderr) > 3000 else process.stderr
}

print(json.dumps(output))
`);

    // Parse the output
    const stdoutLogs = result.logs?.stdout || [];
    const rawOutput = stdoutLogs.join('');

    let buildResult;
    try {
      buildResult = JSON.parse(rawOutput.trim());
    } catch {
      // If we can't parse, treat the raw output as an error
      return NextResponse.json({
        success: true,
        hasErrors: rawOutput.includes('error') || rawOutput.includes('Error'),
        errors: rawOutput ? [rawOutput] : [],
        raw: rawOutput
      });
    }

    const hasErrors = buildResult.exitCode !== 0;
    const errorOutput = (buildResult.stderr || '') + '\n' + (buildResult.stdout || '');

    // Parse individual errors from the output
    const errors: string[] = [];
    if (hasErrors) {
      // Extract error blocks: Vite/Babel/ESBuild errors typically start with file paths or [plugin:]
      const errorLines = errorOutput.split('\n');
      let currentError = '';

      for (const line of errorLines) {
        if (line.includes('error') || line.includes('Error') || line.includes('[plugin:') || line.match(/^\s*\d+\s*\|/)) {
          currentError += line + '\n';
        } else if (currentError && line.trim()) {
          currentError += line + '\n';
        } else if (currentError) {
          errors.push(currentError.trim());
          currentError = '';
        }
      }
      if (currentError) errors.push(currentError.trim());

      // If no structured errors found, use the full output
      if (errors.length === 0 && errorOutput.trim()) {
        errors.push(errorOutput.trim());
      }
    }

    return NextResponse.json({
      success: true,
      hasErrors,
      errors,
      exitCode: buildResult.exitCode,
      raw: errorOutput.substring(0, 2000)
    });

  } catch (error: any) {
    console.error('[check-vite-errors] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Keep the GET stub for backwards compatibility
export async function GET() {
  return NextResponse.json({
    success: true,
    errors: [],
    message: 'Use POST with { sandboxId } to check for errors'
  });
}