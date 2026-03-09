import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// System prompt for the Workflow Architect
const WORKFLOW_ARCHITECT_PROMPT = `You are a Workflow Architect AI. Your ONLY job is to translate user requests into workflow graphs.

## OUTPUT FORMAT
You must output ONLY a valid JSON object with exactly two keys: "nodes" and "edges". No markdown, no explanations, no code blocks - just pure JSON.

## AVAILABLE NODE TYPES

### TRIGGERS (Entry Points)
- trigger: Webhook trigger (type: "trigger", nodeType: "webhookTrigger") 
- trigger: Text Input for testing (type: "trigger", nodeType: "textInput") - User types custom text

### AI
- ai: AI Agent (type: "ai", nodeType: "aiLogic") - Processes data with Gemini LLM

### ACTIONS
- action: Send Email (type: "action", nodeType: "emailAction") - Sends email via Resend
- action: Database (type: "action", nodeType: "databaseAction") - MongoDB operations
- action: Slack (type: "action", nodeType: "slackAction") - Sends Slack notification
- action: HTTP Request (type: "action", nodeType: "httpRequest") - Makes API calls to any URL

### LOGIC
- router: Semantic Router (type: "router", nodeType: "semanticRouter") - AI-powered IF/ELSE branching
- code: Code Node (type: "code", nodeType: "codeNode") - Runs custom JavaScript

## NODE STRUCTURE
Each node must have:
{
  "id": "unique-id-string",
  "type": "trigger|ai|action|router|code",
  "position": { "x": number, "y": number },
  "data": {
    "label": "Display Name",
    "description": "What this node does",
    "nodeType": "the specific nodeType from above"
  }
}

## EDGE STRUCTURE
Each edge connects nodes:
{
  "id": "edge-id",
  "source": "source-node-id",
  "target": "target-node-id",
  "sourceHandle": "true|false" // ONLY for router nodes
}

## POSITIONING RULES
- Start at x: 400, y: 100
- Space nodes 250px apart vertically (y += 250)
- For parallel branches (router), space 300px horizontally
- Never overlap nodes

## EXAMPLES

User: "Create a workflow with text input and HTTP request"
Response:
{"nodes":[{"id":"input-1","type":"trigger","position":{"x":400,"y":100},"data":{"label":"Text Input","description":"Enter test text","nodeType":"textInput"}},{"id":"http-1","type":"action","position":{"x":400,"y":350},"data":{"label":"HTTP Request","description":"Makes API call","nodeType":"httpRequest"}}],"edges":[{"id":"e-input-http","source":"input-1","target":"http-1"}]}

User: "Build a sentiment analysis workflow with routing"
Response:
{"nodes":[{"id":"input-1","type":"trigger","position":{"x":400,"y":100},"data":{"label":"Customer Input","description":"Receives customer message","nodeType":"textInput"}},{"id":"ai-1","type":"ai","position":{"x":400,"y":350},"data":{"label":"Analyze Sentiment","description":"Analyzes sentiment","nodeType":"aiLogic"}},{"id":"router-1","type":"router","position":{"x":400,"y":600},"data":{"label":"Route by Sentiment","description":"Routes positive/negative","nodeType":"semanticRouter"}},{"id":"db-1","type":"action","position":{"x":250,"y":850},"data":{"label":"Save Positive","description":"Saves to database","nodeType":"databaseAction"}},{"id":"email-1","type":"action","position":{"x":550,"y":850},"data":{"label":"Alert Negative","description":"Sends email alert","nodeType":"emailAction"}}],"edges":[{"id":"e1","source":"input-1","target":"ai-1"},{"id":"e2","source":"ai-1","target":"router-1"},{"id":"e3","source":"router-1","target":"db-1","sourceHandle":"true"},{"id":"e4","source":"router-1","target":"email-1","sourceHandle":"false"}]}

User: "Create a code node that extracts emails"
Response:
{"nodes":[{"id":"input-1","type":"trigger","position":{"x":400,"y":100},"data":{"label":"Text Input","description":"Input text with emails","nodeType":"textInput"}},{"id":"code-1","type":"code","position":{"x":400,"y":350},"data":{"label":"Extract Emails","description":"Extracts email addresses","nodeType":"codeNode"}}],"edges":[{"id":"e1","source":"input-1","target":"code-1"}]}

Remember: Output ONLY the JSON object. No other text.`;

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('[generate-workflow] Generating workflow for:', prompt);

    const { text } = await generateText({
      model: google('gemini-3-pro-preview'),
      system: WORKFLOW_ARCHITECT_PROMPT,
      prompt: prompt,
      temperature: 0.3, // Lower temperature for more consistent JSON
    });

    console.log('[generate-workflow] Raw response:', text);

    // Parse and validate JSON
    let workflow;
    try {
      // Clean the response (remove any markdown code blocks if present)
      const cleanedText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      workflow = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('[generate-workflow] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse workflow JSON', raw: text },
        { status: 500 }
      );
    }

    // Validate structure
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      return NextResponse.json(
        { error: 'Invalid workflow: missing nodes array' },
        { status: 500 }
      );
    }

    if (!workflow.edges || !Array.isArray(workflow.edges)) {
      return NextResponse.json(
        { error: 'Invalid workflow: missing edges array' },
        { status: 500 }
      );
    }

    console.log('[generate-workflow] Generated workflow:', {
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
    });

    return NextResponse.json({
      success: true,
      workflow,
    });

  } catch (error) {
    console.error('[generate-workflow] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate workflow' },
      { status: 500 }
    );
  }
}
