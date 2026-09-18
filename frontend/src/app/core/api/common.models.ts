/** The stable pagination envelope both services answer with. */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface Sort {
  field: string;
  direction: SortDirection;
}

export interface PageRequest {
  page: number;
  size: number;
  sort?: Sort;
}

/** One rejected input, as the backend flattens it for a form. */
export interface FieldViolation {
  field: string;
  message: string;
  rejectedValue?: unknown;
}

/** An RFC 7807 problem document with the members every BiMap error carries. */
export interface Problem {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  timestamp?: string;
  correlationId?: string;
  violations?: FieldViolation[];
  [extension: string]: unknown;
}

/** Acknowledgement for flows that deliberately reveal nothing else. */
export interface OperationResult {
  message: string;
}
