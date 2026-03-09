import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { resolveVariables } from '@/app/agentai/lib/variable-resolver';
import { type ExecutionContext } from '@/app/agentai/lib/node-schemas';

export const dynamic = 'force-dynamic';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const ROUTER_SYSTEM_PROMPT = `You are a semantic decision-making engine. Your job is to evaluate a condition against provided data and return a boolean result.

INSTRUCTIONS:
1. Analyze the user's condition/rule carefully
2. Compare it against the provided data context
3. Return ONLY a JSON object with this exact format:
{
  "result": true or false,
  "reasoning": "Brief explanation of why you chose this result"
}

EXAMPLES:
- Condition: "If the sentiment is negative"
  Data: {"message": "I hate this product, it's terrible!"}
  Response: {"result": true, "reasoning": "The message contains strongly negative sentiment with words like 'hate' and 'terrible'"}

- Condition: "If the price is over $100"
  Data: {"product": "Laptop", "price": 75}
  Response: {"result": false, "reasoning": "The price is $75 which is below the $100 threshold"}

- Condition: "If the user is asking about pricing"
  Data: {"query": "How much does the premium plan cost?"}
  Response: {"result": true, "reasoning": "The query explicitly asks about cost/pricing"}

Always respond with valid JSON only. No markdown, no extra text.`;

export async function POST(request: NextRequest) {
  try {
    const { condition, data, context } = await request.json();

    if (!condition) {
      return NextResponse.json(
        { error: 'Missing required field: condition' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[Router] Missing GEMINI_API_KEY');
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Resolve any variables in the condition
    const executionContext: ExecutionContext = context || {};
    const resolvedCondition = resolveVariables(condition, executionContext);

    console.log('[Router] Condition:', resolvedCondition);
    console.log('[Router] Data:', JSON.stringify(data).substring(0, 200));

    // Build the prompt for Gemini
    const prompt = `
CONDITION TO EVALUATE:
${resolvedCondition}

DATA CONTEXT:
${JSON.stringify(data, null, 2)}

Evaluate the condition against the data and respond with the JSON result.`;

    // Call Gemini for semantic evaluation
    const { text } = await generateText({
      model: google('gemini-3-pro-preview'),
      system: ROUTER_SYSTEM_PROMPT,
      prompt: prompt,
      temperature: 0.1, // Low temperature for consistent decisions
    });

    console.log('[Router] Gemini response:', text);

    // Parse the JSON response
    let result: { result: boolean; reasoning: string };
    
    try {
      // Clean the response (remove markdown code blocks if present)
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7);
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();

      result = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('[Router] Failed to parse Gemini response:', parseError);
      // Default to false if parsing fails
      result = {
        result: false,
        reasoning: 'Failed to parse AI response, defaulting to false',
      };
    }

    console.log('[Router] Decision:', result.result ? 'TRUE' : 'FALSE');
    console.log('[Router] Reasoning:', result.reasoning);

    return NextResponse.json({
      success: true,
      output: {
        result: Boolean(result.result),
        reasoning: result.reasoning,
        condition: resolvedCondition,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[Router] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Router evaluation failed';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        output: {
          result: false,
          reasoning: `Error: ${errorMessage}`,
          timestamp: new Date().toISOString(),
        }
      },
      { status: 500 }
    );
  }
}
