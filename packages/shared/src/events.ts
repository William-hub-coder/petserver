/** Reserved domain event names for future MQ wiring */
export const DomainEvents = {
  USER_REGISTERED: 'user.registered',
  PET_PROFILE_UPDATED: 'user.pet_profile.updated',
  MERCHANT_APPLIED: 'merchant.applied',
  MERCHANT_SCREENED: 'merchant.screened',
  INSPECT_TASK_ASSIGNED: 'inspect.task.assigned',
  INSPECT_REPORT_SUBMITTED: 'inspect.report.submitted',
  INSPECT_REVIEW_DECIDED: 'inspect.review.decided',
  CREDIT_SCORE_CHANGED: 'merchant.credit_score.changed',
  MESSAGE_DISPATCH: 'message.dispatch',
  ORDER_STATUS_CHANGED: 'order.status.changed',
  SECURITY_ALERT: 'security.alert',
} as const;

export type DomainEventName = (typeof DomainEvents)[keyof typeof DomainEvents];
