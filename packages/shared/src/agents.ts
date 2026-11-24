/** Eight agents overview — shell phase only stubs for MVP set */
export enum AgentId {
  A1_CUSTOMER = 'A1',
  A2_MERCHANT = 'A2',
  A3_COMMERCE = 'A3',
  A4_DATA = 'A4',
  A5_TRIAGE = 'A5',
  A6_MESSAGE = 'A6',
  A7_EXPERIENCE = 'A7',
  A8_SECURITY = 'A8',
}

export const MVP_AGENTS: AgentId[] = [
  AgentId.A1_CUSTOMER,
  AgentId.A2_MERCHANT,
  AgentId.A6_MESSAGE,
  AgentId.A8_SECURITY,
];
