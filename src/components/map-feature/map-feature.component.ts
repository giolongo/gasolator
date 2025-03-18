import { Component, effect, EventEmitter, inject, input, OnInit, Output, output } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import { Feature, Overlay } from 'ol';
import { Point, LineString } from 'ol/geom';
import { Icon, Style, Stroke, Fill } from 'ol/style';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { RestService } from '../../services/rest.service';
import { DistanceModel, OsrmRoute } from '../../models';
import { CommonModule } from '@angular/common';
import { combineLatest, Observable, switchMap, tap } from 'rxjs';
import { createEmpty, extend, Extent } from 'ol/extent';

@Component({
  selector: 'app-map-feature',
  imports: [CommonModule],
  templateUrl: './map-feature.component.html',
  styleUrls: ['./map-feature.component.scss']
})
export class MapFeatureComponent implements OnInit {
  private restService = inject(RestService);

  private combinedExtent: Extent = createEmpty();

  private dynamicLayers: VectorLayer<VectorSource>[] = [];

  coordinate = input<{coordinate: DistanceModel, isRoundTrip: boolean}>();


  distanceInKm = output<number>();
  distanceInKmVal = 0;
  // @Output() showToast = new EventEmitter<number>();

  map?: Map;

  constructor() {
    effect(() => {
      this.distanceInKm.emit(0)
      this.distanceInKmVal = 0;
      const promises = [];
      if (this.coordinate()?.coordinate.from && this.coordinate()?.coordinate.to) {
        this.removeDynamicLayers(); // 🔹 Rimuove i vecchi marker e route
        const coordinate = this.coordinate()?.coordinate;
        if (!coordinate?.intermediateStops || coordinate.intermediateStops.length === 0) {
          const promise = this.initializeMap(coordinate?.from, coordinate?.to);
          if (promise) {
            promises.push(promise);
          }
        } else {
          promises.push(this.initializeMap(coordinate?.from, coordinate?.intermediateStops[0]));
          promises.push(this.initializeMap(coordinate?.intermediateStops[coordinate?.intermediateStops.length - 1], coordinate?.to));

          for (let i = 0; i < (coordinate?.intermediateStops?.length ?? 0); i++) {
            promises.push(this.initializeMap(coordinate?.intermediateStops[i], coordinate?.intermediateStops[i + 1]));
          }
        }
        if(this.coordinate()?.isRoundTrip){
          const coordinate = this.coordinate()?.coordinate;
          if (!coordinate?.intermediateStops || coordinate.intermediateStops.length === 0) {
            const promise = this.initializeMap(coordinate?.to, coordinate?.from);
            if (promise) {
              promises.push(promise);
            }
          } else {
            debugger
            promises.push(this.initializeMap(coordinate?.to, coordinate?.intermediateStops[coordinate?.intermediateStops.length - 1]));
            promises.push(this.initializeMap(coordinate?.intermediateStops[0], coordinate?.from));
  
            for (let i = 0; i < (coordinate?.intermediateStops?.length ?? 0); i++) {
              promises.push(this.initializeMap(coordinate?.intermediateStops.reverse()[i], coordinate?.intermediateStops.reverse()[i + 1]));
            }
          }
        }
        combineLatest(promises.filter(p => !!p)).subscribe({
          next: () => {

            if (this.map) {
              this.map.getView().fit(this.combinedExtent, { padding: [50, 50, 50, 50] });
            }

            this.distanceInKm.emit(this.distanceInKmVal);
            this.combinedExtent = createEmpty()
          }
        })
      }
    })
  }

  ngOnInit(): void {
    // 🔹 **Layer di base con OpenStreetMap**
    const osmLayer = new TileLayer({
      source: new OSM()
    });

    // 🔹 **Inizializza la mappa con Roma come fallback**
    this.map = new Map({
      target: 'map', // ID dell'elemento HTML
      layers: [osmLayer], // Assicurati che OSM sia il primo layer
      view: new View({
        center: fromLonLat([12.4964, 41.9028]), // Roma
        zoom: 12
      })
    });
    this.initializeMap()?.subscribe;
  }

  initializeMap(from?: { lat: number | string, lon: number | string, name: string }, to?: { lat: number | string, lon: number | string, name: string }): Observable<OsrmRoute> | void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const userLon = position.coords.longitude;
        const userLat = position.coords.latitude;
        this.map?.getView().setCenter(fromLonLat([userLon, userLat]));
      }, (error) => {
        console.error("Errore geolocalizzazione:", error);
      });
    } else {
      alert("Geolocalizzazione non supportata.");
    }

    if (from && to) {
      this.addMarkers(+from.lon, +from.lat, +to.lon, +to.lat);
      return this.drawRoute(+from.lon, +from.lat, [+to.lon, +to.lat], from.name, to.name);
    }
  }

  removeDynamicLayers(): void {
    if (this.map) {
      this.dynamicLayers.forEach(layer => this.map?.removeLayer(layer));
      this.dynamicLayers = []; // Svuota l'array
    }
  }


  // 🔹 **Funzione per aggiungere i marker di inizio e fine percorso**
  addMarkers(userLon: number, userLat: number, destLon: number, destLat: number): void {
    const userLocation = new Feature({
      geometry: new Point(fromLonLat([userLon, userLat]))
    });

    const destinationLocation = new Feature({
      geometry: new Point(fromLonLat([destLon, destLat]))
    });

    // 🔹 **Stili dei marker**
    const markerStyle = new Style({
      image: new Icon({
        src: 'gasolator_logo.png', // Sostituiscilo con il tuo file icona
        scale: 0.15
      })
    });

    userLocation.setStyle(markerStyle);
    destinationLocation.setStyle(markerStyle);

    // 🔹 **Layer dei marker**
    const vectorSource = new VectorSource({
      features: [userLocation, destinationLocation]
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource
    });

    this.dynamicLayers.push(vectorLayer);
    this.map?.addLayer(vectorLayer);
  }

  // 🔹 **Funzione per calcolare e disegnare il percorso**
  drawRoute(startLon: number, startLat: number, endLonLat: number[], from: string, to: string): Observable<OsrmRoute> {
    return this.restService.getOsrmRoute(startLon, startLat, endLonLat[0], endLonLat[1])
      .pipe(tap(data => {
        if (data && 'routes' in data && data.routes && data.routes.length > 0) {

          const route = data.routes[0].geometry;
          const coordinates = this.decodePolyline(route);

          const transformedCoordinates = coordinates.map(coord => fromLonLat(coord));
          const routeLine = new LineString(transformedCoordinates);
          const routeFeature = new Feature(routeLine);
          const color = this.getRandomColor();
          const routeStyle = new Style({
            stroke: new Stroke({
              color,
              width: 4
            })
          });

          routeFeature.setStyle(routeStyle);

          const routeSource = new VectorSource({
            features: [routeFeature]
          });

          const routeLayer = new VectorLayer({
            source: routeSource
          });

          this.dynamicLayers.push(routeLayer);
          this.map?.addLayer(routeLayer);

          const extent = routeLine.getExtent();
          this.combinedExtent = extend(this.combinedExtent, extent);
          // this.map?.getView().fit(extent, { padding: [50, 50, 50, 50] });
          const distance = data.routes[0].distance;
          this.distanceInKmVal += (+(distance / 1000).toFixed(2));

          // 🔹 **Aggiungi overlay tooltip**
          const tooltipElement = document.createElement('div');
          tooltipElement.className = 'ol-tooltip';
          tooltipElement.style.cssText = `background: ${this.hexToRgba(color)}; color: white; padding: 5px 10px; border-radius: 4px; white-space: nowrap;`;

          const tooltipOverlay = new Overlay({
            element: tooltipElement,
            offset: [10, 0],
            positioning: 'bottom-left',
            stopEvent: false
          });

          this.map?.addOverlay(tooltipOverlay);

          // 🔹 **Evento hover sulla linea**
          this.map?.on('pointermove', (evt) => {
            const feature = this.map?.forEachFeatureAtPixel(evt.pixel, (f) => f);
            if (feature === routeFeature) {
              const coordinate = evt.coordinate;
              tooltipElement.innerHTML = `<div style="text-align: left; font-size:.75rem"><div>From ${from}</div> <div>To ${to}</div> <div>Distance: ${(distance / 1000).toFixed(2)} km</div></div>`;
              tooltipOverlay.setPosition(coordinate);
              tooltipElement.style.display = 'block';
            } else {
              tooltipElement.style.display = 'none';
            }
          });

        } else {
          console.warn('Nessun percorso trovato.');
        }
      }));
  }

  // 🔹 **Funzione per decodificare la geometria Polyline**
  decodePolyline(encoded: string): [number, number][] {
    let index = 0, lat = 0, lng = 0;
    const coordinates: [number, number][] = [];
    while (index < encoded.length) {
      let shift = 0, result = 0;
      let byte;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += deltaLat;

      shift = 0;
      result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += deltaLng;

      coordinates.push([lng / 1e5, lat / 1e5]);
    }
    return coordinates;
  }

  getRandomColor(): string {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  }

  hexToRgba(hex: string): string {
    // Rimuove il simbolo "#" se presente
    hex = hex.replace('#', '');

    // Supporta formato breve (#f00)
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${0.7})`;
  }
}
