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
      `${this.appConfig.niminatimUrl}/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=polyline`,
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
}
