export interface FormModel {
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
