import 'server-only';
import { getToolName, isToolUIPart, type UIMessage } from 'ai';

/** Shapes and playbooks get reused in later turns; dropping them only buys a repeat call. */
const KEEP_IN_FULL = new Set(['describeOperation', 'loadSkill']);
const MAX_OUTPUT_CHARS = 2_000;
const PREVIEW_CHARS = 1_000;

type Part = UIMessage['parts'][number];

function compactPart(part: Part): Part {
  if (!isToolUIPart(part) || part.state !== 'output-available') return part;

  const name = getToolName(part);
  if (KEEP_IN_FULL.has(name)) return part;

  if (name === 'searchOperations') {
    const results = (part.output as { results?: Array<{ key: string; kind: string }> })?.results ?? [];
    return { ...part, output: { earlierSearch: results.map((r) => `${r.kind} ${r.key}`) } } as Part;
  }

  const serialized = JSON.stringify(part.output) ?? '';
  if (serialized.length <= MAX_OUTPUT_CHARS) return part;

  return {
    ...part,
    output: {
      compacted: `Result from an earlier turn, shortened from ${serialized.length} characters to save context. Call the tool again if you need the full data.`,
      preview: serialized.slice(0, PREVIEW_CHARS),
    },
  } as Part;
}

/**
 * Every step resends the whole conversation, so a page's HTML or layout JSON read three turns
 * ago is paid for again on every later step. Tool results from turns before the latest user
 * message are shortened to a preview; the current turn is left intact because the model is still
 * using it. The agent's own replies, which restate the ids and outcomes, are kept in full.
 */
export function compactHistory<M extends UIMessage>(messages: M[]): M[] {
  let lastUser = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUser = i;
      break;
    }
  }
  if (lastUser <= 0) return messages;

  return messages.map((message, index) =>
    index >= lastUser || message.role !== 'assistant'
      ? message
      : { ...message, parts: message.parts.map(compactPart) }
  );
}
