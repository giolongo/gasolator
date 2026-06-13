export interface RouteMetrics {
  distanceKm: number;
  durationMinutes: number;
  routeWarnings: string[];
}

export interface RouteSummary extends RouteMetrics {
  fuelCost: number;
  vehicleWearCost: number;
  tollCost: number;
  tollCostSource: 'estimated' | 'manual';
  totalCost: number;
  consumption: string;
}
