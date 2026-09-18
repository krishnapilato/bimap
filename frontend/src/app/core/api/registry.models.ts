export type RegistrationStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'ARCHIVED';

export type FieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DECIMAL' | 'SELECT' | 'AUTOCOMPLETE' | 'COORDINATE';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  maxLength?: number;
  pattern?: string;
  placeholder?: string;
  help?: string;
  /** Endpoint an autocomplete queries, with `{field}` placeholders for the answers above it. */
  lookupUrl?: string;
  dependsOn?: string;
  options: FieldOption[];
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormSchema {
  id: string;
  title: string;
  version: string;
  cascade: string[];
  sections: FormSection[];
}

export interface TableColumn {
  field: string;
  header: string;
  type: FieldType;
  sortable: boolean;
  filterable: boolean;
  visibleByDefault: boolean;
}

export interface TableSchema {
  id: string;
  columns: TableColumn[];
  defaultSort: string;
  defaultDirection: 'asc' | 'desc';
}

/** What the registration form submits. */
export interface RegistrationRequest {
  region: string;
  provinceName: string;
  provinceCode: string;
  municipality: string;
  istatCode: string;
  cadastralCode?: string;
  postalCode?: string;
  address: string;
  houseNumber?: string;
  locality?: string;
  latitude?: number;
  longitude?: number;
  assetName: string;
  assetReference?: string;
  entityBillingCode?: string;
  entityName?: string;
  ownership?: string;
  protectionMeasure?: string;
  constraintType?: string;
  cadastralReference?: string;
  transcription?: string;
  notes?: string;
}

export interface Registration extends RegistrationRequest {
  id: string;
  fullAddress: string;
  status: RegistrationStatus;
  reviewNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationQuery {
  q?: string;
  region?: string;
  provinceCode?: string;
  istatCode?: string;
  status?: RegistrationStatus;
  from?: string;
  to?: string;
}

export interface RegistrationStatistics {
  total: number;
  byStatus: Partial<Record<RegistrationStatus, number>>;
  topRegions: Record<string, number>;
}

export interface RegistrationStatusChange {
  status: RegistrationStatus;
  note?: string;
}

/** The lifecycle moves the backend accepts from each state. */
export const REGISTRATION_TRANSITIONS: Record<RegistrationStatus, readonly RegistrationStatus[]> = {
  DRAFT: ['SUBMITTED', 'ARCHIVED'],
  SUBMITTED: ['VERIFIED', 'REJECTED', 'DRAFT'],
  REJECTED: ['DRAFT', 'SUBMITTED', 'ARCHIVED'],
  VERIFIED: ['ARCHIVED'],
  ARCHIVED: [],
};

export const isEditableByAuthor = (status: RegistrationStatus): boolean =>
  status === 'DRAFT' || status === 'REJECTED';
