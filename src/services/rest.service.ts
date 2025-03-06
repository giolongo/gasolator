import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RestService {

  http = inject(HttpClient);

  constructor() { }

  public getOsrmRoute(startLon: number, startLat: number, endLon: number, endLat: number): Observable<{routes: {geometry: string}[]}> {
    return this.http.get<{routes: {geometry: string}[]}>(`https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=polyline`)
  }

  public searchAddress(query: string): Observable<{place_id: number, display_name: string, lat: number, long: number}[]> {
    return this.http.get<{place_id: number, display_name: string, lat: number, long: number}[]>(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
  }
}
