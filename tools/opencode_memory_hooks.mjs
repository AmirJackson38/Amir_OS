import { MemoryJournal, tracked } from './memory_hook_core.mjs';
import { recovery } from './task_checkpoint.mjs';

// tool helper supplied by the installed OpenCode package via a tiny global loader.
export default async function memoryHooks({ directory }, { root, tool }) {
  const journal = new MemoryJournal(root);
  function brief(sessionID) {
    let sessions;
    try { sessions = journal.all().filter(s => s.pending.length); }
    catch (error) { return `[Amir OS memory hook] Journal needs inspection: ${error.message}. Do not assume previous actions failed or replay them.`; }
    const current = sessions.find(s => s.session === sessionID);
    const lines = [
      '[Amir OS automatic continuity]',
      'Local hooks save intent metadata before potentially changing tools and receipts after return. Tool return is NOT proof of success. Use the user request and live verification to determine outcome.',
      'Before finalizing consequential changes: verify results, write/update a dated Amir_OS/memory record with outcome, evidence, uncertainty and next action, then use memory_status and memory_complete. For read-only/no-change work, acknowledge with evidence instead of creating a needless note.',
    ];
    if (current) {
      const rateLimited = current.pending.filter(p => p.rateLimited).length;
      lines.push(`This session: ${current.pending.length} unacknowledged calls; ${current.pending.filter(p => p.state === 'prepared-outcome-unknown').length} without a return receipt${rateLimited ? `; ${rateLimited} rate-limited` : ''}.`);
      for (const p of current.pending.slice(-3)) lines.push(`${p.call}: ${p.tool} — ${p.state}${p.exitCode === null ? '' : ` (exit ${p.exitCode})`}${p.rateLimited ? ' [RATE LIMITED]' : ''}`);
    }
    const other = sessions.filter(s => s.session !== sessionID);
    if (other.length) lines.push(`Other sessions awaiting review: ${other.length}. Recent session IDs: ${other.slice(-3).map(s => s.session).join(', ')}. Use memory_status with that session ID when resuming; old work is not authorization to continue.`);
    for (const task of recovery(root).filter(t => t.error || t.state?.status === 'active').slice(0, 2)) {
      const pending = task.state?.steps.find(s => s.status === 'uncertain');
      lines.push(`Manual task ${task.id}: ${task.error ? 'invalid journal; inspect' : pending ? `UNCERTAIN; verify ${pending.verify.slice(0, 180)}` : task.state.next.slice(0, 180)}`);
    }
    return lines.join('\n');
  }
  return {
    'tool.execute.before': async (input, output) => {
      // A disk/persistence error throws here BEFORE the action. Never silently skip intent recording.
      journal.before(input, output.args, directory);
    },
    'tool.execute.after': async (input, output) => {
      if (!tracked(input.tool)) return;
      try { journal.after(input, output); }
      catch { output.output += '\n[Amir OS: return receipt could not be saved. The action may already have run; inspect its target before retrying.]'; }
    },
    'experimental.chat.system.transform': async (input, output) => { if (input.sessionID) output.system.push(brief(input.sessionID)); },
    'experimental.session.compacting': async (input, output) => { output.context.push(brief(input.sessionID)); },
    tool: {
      memory_status: tool({
        description: 'Read local automatic action journal. Shows uncertain/returned-but-unverified calls and a snapshot token. Optional sessionID inspects an earlier session; no raw commands or secrets are logged.',
        args: { sessionID: tool.schema.string().optional(), offset: tool.schema.number().int().min(0).optional() },
        async execute(args, context) {
          const state = journal.status(args.sessionID || context.sessionID);
          const offset = args.offset || 0;
          return JSON.stringify({ ...state, pending: state.pending.slice(offset, offset + 20), totalPending: state.pending.length,
            nextOffset: offset + 20 < state.pending.length ? offset + 20 : null,
            note: 'All fingerprints are covered by snapshot. Inspect original session/tool evidence before acknowledging the full set.' });
        },
      }),
      memory_complete: tool({
        description: 'Acknowledge a reviewed journal snapshot after verification. Critical changes require an updated Markdown record under Amir_OS/memory. Read-only/no-change actions need an evidence explanation. Does not verify prose or close manual tasks.',
        args: { sessionID: tool.schema.string().optional(), snapshot: tool.schema.string(),
          disposition: tool.schema.enum(['recorded', 'read-only-or-no-change']), evidence: tool.schema.string(), record: tool.schema.string().optional() },
        async execute(args, context) { return journal.complete(args.sessionID || context.sessionID, args); },
      }),
    },
  };
}
