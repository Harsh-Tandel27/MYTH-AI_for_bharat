import { NextRequest, NextResponse } from "next/server";

/**
 * Vapi Server Tool Handler
 * Called when the assistant invokes `generateProjectBlueprint`
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "No message in request" },
        { status: 400 },
      );
    }

    if (message.type === "tool-calls") {
      const toolCalls = message.toolCallList || message.toolCalls || [];

      const results = toolCalls.map((toolCall: any) => {
        if (toolCall.function?.name === "generateProjectBlueprint") {
          const args =
            typeof toolCall.function.arguments === "string"
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments;

          console.log(
            "[SitePilot] Blueprint data received:",
            JSON.stringify(args, null, 2),
          );

          return {
            toolCallId: toolCall.id,
            result: JSON.stringify({
              success: true,
              message: `Project blueprint for "${args.projectName}" has been generated successfully. The user can now see it on their screen.`,
            }),
          };
        }

        return {
          toolCallId: toolCall.id,
          result: JSON.stringify({ success: false, message: "Unknown tool" }),
        };
      });

      return NextResponse.json({ results });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SitePilot] Error handling Vapi webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
