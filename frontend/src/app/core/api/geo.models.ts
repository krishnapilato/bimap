export interface Region {
  name: string;
}

export interface Province {
  code: string;
  name: string;
  abbreviation: string;
  region: string;
}

export interface Municipality {
  istatCode: string;
  name: string;
  cadastralCode?: string;
  postalCode?: string;
  province?: string;
  provinceCode?: string;
  region?: string;
  population?: number;
  latitude?: number;
  longitude?: number;
}

export interface Address {
  label: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  municipality?: string;
  province?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

/** A public body and the codes it is invoiced through. */
export interface EntityCode {
  name: string;
  /** Codice univoco used for electronic invoicing. */
  billingCode?: string;
  /** Index of Public Administrations identifier. */
  ipaCode?: string;
  taxCode?: string;
  category?: string;
  municipality?: string;
  province?: string;
  region?: string;
  offices?: number;
  reference?: string;
}

export interface AddressQuery {
  street?: string;
  municipality?: string;
  province?: string;
  region?: string;
  /** Free text anywhere in Italy, used when no street is given. */
  q?: string;
  limit?: number;
}
