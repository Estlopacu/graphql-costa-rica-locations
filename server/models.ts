export interface LocationBase {
  id: string;
  nombre: string;
  codigoPostal?: string;
}

export interface ProvinciaModel extends LocationBase {}

export interface CantonModel extends LocationBase {
  provinciaId: string;
}

export interface DistritoModel extends LocationBase {
  cantonId: string;
}

export interface RawDistrito extends LocationBase {}

export interface RawCanton extends LocationBase {
  distritos: RawDistrito[];
}

export interface RawProvincia extends LocationBase {
  cantones: RawCanton[];
}

export interface RawData {
  provincias: RawProvincia[];
}
