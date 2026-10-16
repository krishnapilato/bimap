export interface AssetForm {
  readonly id?: number;
  region: string;
  province: string;
  municipality: string;
  address: string;
  number: number;
  goodNaming: string;
  goodID: number;
  istatCode: string | null;
  latitude: number;
  longitude: number;
}

export interface Asset {
  readonly id: number;
  idbene: number;
  prov: string;
  comune: string;
  indirizzo: string;
  civico: number;
  localizzazione: string;
  denominazione: string;
  provvTutela: string;
  proprieta: string;
  catato: string;
  trascrizione: string;
  vincolo: string;
}

export interface Municipality {
  nome: string;
  codice: string;
  coordinate: { lat: number; lng: number };
  provincia: { nome: string; sigla: string; regione: string };
}
