export type FuelType = 'petrol' | 'diesel' | 'lpg' | 'methane';
export type UsageMode = 'route' | 'area';

export interface FuelPrice {
  type: FuelType;
  price?: number;
  displayPrice?: string;
  self?: boolean;
  updatedAt?: string;
}

export interface FuelStation {
  id: string;
  lat: number;
  lon: number;
  name: string;
  brand?: string;
  address?: string;
  openingHours?: string;
  prices: FuelPrice[];
  electric: boolean;
}

export interface FuelDataManifest {
  updatedAt: string;
  gridSize: number;
  cells: string[];
}

export interface FuelAreaSearch {
  mode: 'area';
  fuelType: FuelType;
  radiusMeters: number;
  center?: {
    lat: number;
    lon: number;
  };
}

export interface FuelRouteSearch {
  mode: 'route';
  coordinate: import('./distance.model').DistanceModel;
  isRoundTrip: boolean;
  fuelType: FuelType;
  showFuelStations: boolean;
}

export type FuelSearchRequest = FuelAreaSearch | FuelRouteSearch;
