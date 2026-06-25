import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, from, map, mergeMap, Observable, of, shareReplay, switchMap, toArray } from 'rxjs';
import { CoordinateModel, FuelDataManifest, FuelStation, NominationSuggestModel, OsrmRoute } from '../models';
import { APP_CONFIG } from '../injections/tokens.injection';

@Injectable({
  providedIn: 'root'
})
export class RestService {
  private readonly routeFuelCorridorKm = 0.15;

  public inLoading = new BehaviorSubject<number>(0);

  http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly fuelManifest$ = this.http.get<FuelDataManifest>('/fuel-data/manifest.json', {
    params: new HttpParams()
      .set('notShowLoader', true)
      .set('v', Date.now().toString())
  }).pipe(shareReplay(1));

  constructor() { }

  public getOsrmRoute(points: CoordinateModel[]): Observable<OsrmRoute> {
    const coordinates = points.map(point => `${point.lon},${point.lat}`).join(';');
    return this.http.get<OsrmRoute>(
      `${this.appConfig.niminatimUrl}/route/v1/driving/${coordinates}?overview=full&geometries=polyline&steps=true&annotations=distance,duration`,
    ).pipe(catchError(e => {
      console.error(e);
      return of({});
    }))
  }

  public getFuelStations(routeCoordinates: [number, number][]): Observable<FuelStation[]> {
    if (routeCoordinates.length < 2) return of([]);

    return this.getMimitFuelStations(routeCoordinates);
  }

  public getFuelStationsAround(center: { lat: number; lon: number }, radiusMeters: number): Observable<FuelStation[]> {
    const radiusKm = Math.max(radiusMeters, 1) / 1000;

    return this.getMimitFuelStationsAround(center, radiusKm);
  }

  private getMimitFuelStations(routeCoordinates: [number, number][]): Observable<FuelStation[]> {
    return this.fuelManifest$.pipe(
      switchMap(manifest => {
        const availableCells = new Set(manifest.cells);
        const requestedCells = this.getRouteGridCells(routeCoordinates)
          .filter(cell => availableCells.has(cell));
        if (!requestedCells.length) return of([]);

        const params = this.getFuelDataParams(manifest);
        return from(requestedCells).pipe(
          mergeMap(cell => this.http.get<FuelStation[]>(`/fuel-data/${cell}.json`, { params }).pipe(
            catchError(() => of([]))
          ), 6),
          toArray(),
          map(cells => {
            const sampledRoute = this.sampleCoordinates(routeCoordinates, 500);
            return cells.flat()
              .filter(station => this.isAlongRoute(station, sampledRoute, this.routeFuelCorridorKm))
              .map(station => ({ ...station, electric: false }));
          })
        );
      }),
      catchError(error => {
        console.error('Unable to load MIMIT fuel prices', error);
        return of([]);
      })
    );
  }

  private getMimitFuelStationsAround(center: { lat: number; lon: number }, radiusKm: number): Observable<FuelStation[]> {
    return this.fuelManifest$.pipe(
      switchMap(manifest => {
        const availableCells = new Set(manifest.cells);
        const requestedCells = this.getAreaGridCells(center, radiusKm)
          .filter(cell => availableCells.has(cell));
        if (!requestedCells.length) return of([]);

        const params = this.getFuelDataParams(manifest);
        return from(requestedCells).pipe(
          mergeMap(cell => this.http.get<FuelStation[]>(`/fuel-data/${cell}.json`, { params }).pipe(
            catchError(() => of([]))
          ), 6),
          toArray(),
          map(cells => cells.flat()
            .filter(station => this.haversineKm(center.lat, center.lon, station.lat, station.lon) <= radiusKm)
            .map(station => ({ ...station, electric: false })))
        );
      }),
      catchError(error => {
        console.error('Unable to load MIMIT fuel prices', error);
        return of([]);
      })
    );
  }

  private getRouteGridCells(routeCoordinates: [number, number][]): string[] {
    const cells = new Set<string>();

    routeCoordinates.forEach(([lon, lat]) => {
      const latIndex = Math.floor(lat * 4);
      const lonIndex = Math.floor(lon * 4);
      for (let latOffset = -1; latOffset <= 1; latOffset++) {
        for (let lonOffset = -1; lonOffset <= 1; lonOffset++) {
          cells.add(`${latIndex + latOffset}_${lonIndex + lonOffset}`);
        }
      }
    });

    return [...cells];
  }

  private getAreaGridCells(center: { lat: number; lon: number }, radiusKm: number): string[] {
    const gridSize = 0.25;
    const latDelta = radiusKm / 110.57;
    const lonDelta = radiusKm / (111.32 * Math.cos(center.lat * Math.PI / 180));
    const minLatIndex = Math.floor((center.lat - latDelta) / gridSize);
    const maxLatIndex = Math.floor((center.lat + latDelta) / gridSize);
    const minLonIndex = Math.floor((center.lon - lonDelta) / gridSize);
    const maxLonIndex = Math.floor((center.lon + lonDelta) / gridSize);
    const cells = new Set<string>();

    for (let latIndex = minLatIndex; latIndex <= maxLatIndex; latIndex++) {
      for (let lonIndex = minLonIndex; lonIndex <= maxLonIndex; lonIndex++) {
        cells.add(`${latIndex}_${lonIndex}`);
      }
    }

    return [...cells];
  }

  private getFuelDataParams(manifest: FuelDataManifest): HttpParams {
    return new HttpParams()
      .set('notShowLoader', true)
      .set('v', manifest.updatedAt);
  }

  private isAlongRoute(station: FuelStation, routeCoordinates: [number, number][], radiusKm: number): boolean {
    if (routeCoordinates.length < 2) return false;

    for (let index = 1; index < routeCoordinates.length; index++) {
      const distance = this.distancePointToSegmentKm(
        station.lat,
        station.lon,
        routeCoordinates[index - 1][1],
        routeCoordinates[index - 1][0],
        routeCoordinates[index][1],
        routeCoordinates[index][0]
      );
      if (distance <= radiusKm) return true;
    }

    return false;
  }

  private distancePointToSegmentKm(
    pointLat: number,
    pointLon: number,
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number
  ): number {
    const meanLatRadians = ((pointLat + startLat + endLat) / 3) * Math.PI / 180;
    const toX = (lon: number) => lon * Math.cos(meanLatRadians) * 111.32;
    const toY = (lat: number) => lat * 110.57;
    const px = toX(pointLon);
    const py = toY(pointLat);
    const sx = toX(startLon);
    const sy = toY(startLat);
    const ex = toX(endLon);
    const ey = toY(endLat);
    const dx = ex - sx;
    const dy = ey - sy;
    const segmentLengthSquared = dx * dx + dy * dy;

    if (segmentLengthSquared === 0) {
      return Math.hypot(px - sx, py - sy);
    }

    const progress = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / segmentLengthSquared));
    const closestX = sx + progress * dx;
    const closestY = sy + progress * dy;
    return Math.hypot(px - closestX, py - closestY);
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRadians = (value: number) => value * Math.PI / 180;
    const deltaLat = toRadians(lat2 - lat1);
    const deltaLon = toRadians(lon2 - lon1);
    const a = Math.sin(deltaLat / 2) ** 2
      + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private sampleCoordinates(coordinates: [number, number][], maxPoints: number): [number, number][] {
    if (coordinates.length <= maxPoints) return coordinates;

    const step = (coordinates.length - 1) / (maxPoints - 1);
    return Array.from({ length: maxPoints }, (_, index) => coordinates[Math.round(index * step)]);
  }

  public searchAddress(query: string): Observable<NominationSuggestModel[]> {
    let params = new HttpParams().set('notShowLoader', true);
    return this.http.get<NominationSuggestModel[]>(
      `${this.appConfig.osrmUrl}/search?format=json&q=${encodeURIComponent(query)}`,
      {params}
    ).pipe(catchError(e => {
      console.error(e);
      return of([]);
    }))
  }

  public reverseGeocode(lat: number, lon: number): Observable<NominationSuggestModel | null> {
    let params = new HttpParams().set('notShowLoader', true);
    return this.http.get<any>(
      `${this.appConfig.osrmUrl}/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
      { params }
    ).pipe(map(res => {
      if (!res) return null;
      return {
        display_name: res.display_name || '',
        lat: res.lat || lat,
        lon: res.lon || lon
      } as NominationSuggestModel;
    }), catchError(e => {
      console.error(e);
      return of(null);
    }))
  }
}
