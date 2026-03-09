import { NextRequest, NextResponse } from 'next/server';
import { resolveVariables } from '@/app/agentai/lib/variable-resolver';
import { type ExecutionContext } from '@/app/agentai/lib/node-schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { code, context } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Missing required field: code' },
        { status: 400 }
      );
    }

    // Resolve variables in the code
    const executionContext: ExecutionContext = context || {};
    const resolvedCode = resolveVariables(code, executionContext);

    console.log('[Code] Executing code...');
    console.log('[Code] Input context keys:', Object.keys(executionContext));

    // Create a sandboxed execution environment
    // The code has access to an 'input' object containing all context data
    const input = { ...executionContext };

    try {
      // Wrap user code in an async IIFE to support await
      // Also provide fetch as a global
      const wrappedCode = `
        return (async () => {
          const input = arguments[0];
          const fetch = arguments[1];
          ${resolvedCode}
        })();
      `;

      // Using Function constructor for sandboxed execution
      const fn = new Function(wrappedCode);
      
      // Execute with timeout protection (10s timeout for async ops)
      const startTime = Date.now();
      const maxExecutionTime = 10000;

      const result = await Promise.race([
        fn(input, fetch),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Code execution timeout (10s)')), maxExecutionTime)
        )
      ]);

      const duration = Date.now() - startTime;
      console.log('[Code] Execution completed in', duration, 'ms');
      console.log('[Code] Result:', JSON.stringify(result)?.substring(0, 200));

      return NextResponse.json({
        success: true,
        output: {
          result: result ?? null,
          executionTime: duration,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (executionError) {
      const errorMessage = executionError instanceof Error ? executionError.message : 'Code execution failed';
      console.error('[Code] Execution error:', errorMessage);
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        output: {
          result: null,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      });
    }

  } catch (error) {
    console.error('[Code] Error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Code execution failed' },
      { status: 500 }
    );
  }
}
