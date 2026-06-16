import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of } from 'rxjs';
import { NominationSuggestModel, OsrmRoute } from '../models';
import { APP_CONFIG } from '../injections/tokens.injection';

@Injectable({
  providedIn: 'root'
})
export class RestService {

  public inLoading = new BehaviorSubject<number>(0);

  http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  constructor() { }

  public getOsrmRoute(startLon: number, startLat: number, endLon: number, endLat: number): Observable<OsrmRoute> {
    return this.http.get<OsrmRoute>(
      `${this.appConfig.niminatimUrl}/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=polyline&steps=true&annotations=distance,duration`,
    ).pipe(catchError(e => {
      console.error(e);
      return of({});
    }))
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
