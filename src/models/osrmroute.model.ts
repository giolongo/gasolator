export interface OsrmRoute {
    routes?: {
      geometry: string;
      distance: number;
      duration: number;
      legs?: {
        summary: string;
        distance: number;
        duration: number;
        steps?: Array<{ name: string; distance: number; duration: number }>;
      }[]
    }[]
}
