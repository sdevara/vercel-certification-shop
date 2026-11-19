import { createModelCallToUIChunkTransform } from "@ai-sdk/workflow";
import { createUIMessageStreamResponse, type UIMessage } from "ai";
import { start } from "workflow/api";
import { adminChatFlow } from "@/lib/workflows/admin-chat-flow";

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const run = await start(adminChatFlow, [messages]);

  return createUIMessageStreamResponse({
    stream: run.readable.pipeThrough(createModelCallToUIChunkTransform()),
    headers: { "x-workflow-run-id": run.runId },
  });
}
