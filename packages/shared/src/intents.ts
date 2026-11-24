/** A1 customer-service intent labels (shell routing) */
export enum AgentIntent {
  GENERAL_QA = 'general_qa',
  FIND_MERCHANT = 'find_merchant',
  SHOPPING = 'shopping',
  CONSULTATION = 'consultation',
  COMPLAINT = 'complaint',
  UNKNOWN = 'unknown',
}

export const INTENT_TO_AGENT: Record<AgentIntent, string> = {
  [AgentIntent.GENERAL_QA]: 'A1',
  [AgentIntent.FIND_MERCHANT]: 'A2',
  [AgentIntent.SHOPPING]: 'A3',
  [AgentIntent.CONSULTATION]: 'A5',
  [AgentIntent.COMPLAINT]: 'human',
  [AgentIntent.UNKNOWN]: 'A1',
};
