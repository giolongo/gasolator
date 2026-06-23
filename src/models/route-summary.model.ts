export interface RouteMetrics {
  distanceKm: number;
  durationMinutes: number;
  routeWarnings: string[];
  fuelStationsCount: number | null;
}

export interface RouteSegment {
  name: string;
  distanceKm: number;
  durationMinutes: number;
}

export interface RouteSummary extends RouteMetrics {
  fuelCost: number;
  vehicleWearCost: number;
  totalCost: number;
  consumption: string;
}
