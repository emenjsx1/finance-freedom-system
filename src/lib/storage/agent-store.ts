/**
 * Conversations, memories and the agent profile.
 * Device-local for now; the shape mirrors the future user-scoped tables
 * (agent_conversations, agent_messages, agent_memories, agent_audit) so the
 * move to the backend with per-user access rules is a contained change.
 */
import { EMPTY_AGENT_STATE, type AgentState } from "@/lib/agent/types";

const STORAGE_KEY = "pfos.agent.v1";

export function loadAgentState(): AgentState {
  if (typeof window === "undefined") return EMPTY_AGENT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_AGENT_STATE;
    return { ...EMPTY_AGENT_STATE, ...(JSON.parse(raw) as Partial<AgentState>) };
  } catch {
    return EMPTY_AGENT_STATE;
  }
}

export function saveAgentState(state: AgentState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
