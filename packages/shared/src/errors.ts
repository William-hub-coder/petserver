/** Unified API error codes for PetPal services */
export enum ErrorCode {
  OK = 'OK',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL = 'INTERNAL',
  AGENT_FALLBACK = 'AGENT_FALLBACK',
  INSPECT_INVALID_STATE = 'INSPECT_INVALID_STATE',
}

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiSuccessBody<T> {
  code: ErrorCode.OK;
  data: T;
}
