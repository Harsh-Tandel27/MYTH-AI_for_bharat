import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { resolveVariables } from '@/app/agentai/lib/variable-resolver';
import { type ExecutionContext } from '@/app/agentai/lib/node-schemas';

export const dynamic = 'force-dynamic';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Valid model names
const VALID_MODELS = [
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
];

export async function POST(request: NextRequest) {
  try {
    const {
      prompt,
      systemInstruction,
      context,
      model = 'gemini-3-pro-preview',
      temperature = 0.7,
      jsonMode = false,
    } = await request.json();

    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('[Gemini] No API key configured');
      return NextResponse.json(
        {
          error: 'GEMINI_API_KEY not configured. Add it to your .env file.',
          output: {
            text: 'Error: API key missing',
            model,
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            timestamp: new Date().toISOString(),
          }
        },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Resolve variables in prompt and system instruction
    const executionContext: ExecutionContext = context || {};
    let resolvedPrompt = resolveVariables(prompt, executionContext);
    const resolvedSystem = systemInstruction
      ? resolveVariables(systemInstruction, executionContext)
      : undefined;

    // JSON Mode: add instruction to return JSON
    if (jsonMode) {
      resolvedPrompt += '\n\nIMPORTANT: Return your response as a valid JSON object only. No markdown, no explanation, just pure JSON.';
    }

    console.log('[Gemini] Model:', model);
    console.log('[Gemini] Temperature:', temperature);
    console.log('[Gemini] JSON Mode:', jsonMode);
    console.log('[Gemini] System:', resolvedSystem?.substring(0, 100) || 'none');
    console.log('[Gemini] Prompt:', resolvedPrompt.substring(0, 200));

    // Validate model
    const selectedModel = VALID_MODELS.includes(model) ? model : 'gemini-3-pro-preview';

    // Call Gemini API with system instruction
    const { text, usage } = await generateText({
      model: google(selectedModel),
      prompt: resolvedPrompt,
      system: resolvedSystem,
      temperature: Math.min(Math.max(Number(temperature) || 0.7, 0), 1),
    });

    console.log('[Gemini] Response length:', text.length);

    // Try to parse JSON if JSON mode is enabled
    let parsedJson = null;
    if (jsonMode) {
      try {
        // Extract JSON from possible markdown code blocks
        let jsonText = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim();
        }
        parsedJson = JSON.parse(jsonText);
      } catch {
        console.warn('[Gemini] Could not parse JSON response');
      }
    }

    return NextResponse.json({
      success: true,
      output: {
        text,
        json: parsedJson,
        model: selectedModel,
        temperature,
        jsonMode,
        usage: {
          promptTokens: (usage as any)?.promptTokens || 0,
          completionTokens: (usage as any)?.completionTokens || 0,
          totalTokens: (usage as any)?.totalTokens || 0,
        },
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[Gemini] Error:', error);

    let errorMessage = error instanceof Error ? error.message : 'Failed to execute Gemini';

    // Handle specific error types
    if (errorMessage.includes('API_KEY')) {
      errorMessage = 'Invalid or expired API key. Check your GEMINI_API_KEY.';
    } else if (errorMessage.includes('quota')) {
      errorMessage = 'API quota exceeded. Try again later or upgrade your plan.';
    } else if (errorMessage.includes('model')) {
      errorMessage = 'Invalid model. Use gemini-3-pro-preview.';
    }

    return NextResponse.json(
      {
        error: errorMessage,
        output: {
          text: `Error: ${errorMessage}`,
          json: null,
          model: 'gemini-3-pro-preview',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          timestamp: new Date().toISOString(),
        }
      },
      { status: 500 }
    );
  }
}
