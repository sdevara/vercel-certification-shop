import { createModelCallToUIChunkTransform } from "@ai-sdk/workflow";
import { createUIMessageStreamResponse, type UIMessage } from "ai";
import { start } from "workflow/api";
import { chatFlow } from "@/lib/workflows/chat-flow";

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const run = await start(chatFlow, [messages]);

  return createUIMessageStreamResponse({
    stream: run.readable.pipeThrough(createModelCallToUIChunkTransform()),
    // The client stores this id so it can resume the stream after a reload.
    headers: { "x-workflow-run-id": run.runId },
  });
}
