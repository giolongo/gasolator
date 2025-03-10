import { Component, effect, EventEmitter, inject, input, OnInit, Output, output } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { Icon, Style, Stroke, Fill } from 'ol/style';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { RestService } from '../../services/rest.service';
import { DistanceModel } from '../../models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-map-feature',
  imports: [CommonModule],
  templateUrl: './map-feature.component.html',
  styleUrls: ['./map-feature.component.scss']
})
export class MapFeatureComponent implements OnInit {
  private restService = inject(RestService);

  private dynamicLayers: VectorLayer<VectorSource>[] = [];

  coordinate = input<DistanceModel>();


  distanceInKm = output<number>();
  distanceInKmVal = 0;
  // @Output() showToast = new EventEmitter<number>();

  map?: Map;

  constructor() {
    effect(() => {
      debugger
      this.distanceInKm.emit(0)
      this.distanceInKmVal = 0;
      if (this.coordinate()?.from && this.coordinate()?.to) {
        debugger
        this.removeDynamicLayers(); // 🔹 Rimuove i vecchi marker e route
        const coordinate = this.coordinate();
        if(!coordinate?.intermediateStops || coordinate.intermediateStops.length === 0){
          this.initializeMap(coordinate?.from, coordinate?.to);
          return;
        }
        this.initializeMap(coordinate?.from, coordinate?.intermediateStops[0]);
        this.initializeMap(coordinate?.intermediateStops[coordinate?.intermediateStops.length - 1], coordinate?.to);

        for(let i = 0; i < (coordinate?.intermediateStops?.length ?? 0); i++){
          this.initializeMap(coordinate?.intermediateStops[i], coordinate?.intermediateStops[i+1]);
        }

        this.distanceInKm.emit(this.distanceInKmVal);

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
    this.initializeMap();
  }

  initializeMap(from?: { lat: number | string, lon: number | string }, to?: { lat: number | string, lon: number | string }): void {
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
      this.drawRoute(+from.lon, +from.lat, [+to.lon, +to.lat]);
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
  drawRoute(startLon: number, startLat: number, endLonLat: number[]): void {
    this.restService.getOsrmRoute(startLon, startLat, endLonLat[0], endLonLat[1]).subscribe(data => {
      if (data && 'routes' in data && data.routes && data.routes.length > 0) {


        const route = data.routes[0].geometry;
        const coordinates = this.decodePolyline(route);

        // 🔹 **Converti le coordinate in formato OpenLayers**
        const transformedCoordinates = coordinates.map(coord => fromLonLat(coord));

        // 🔹 **Crea la LineString del percorso**
        const routeLine = new LineString(transformedCoordinates);

        // 🔹 **Crea un Feature per il percorso**
        const routeFeature = new Feature(routeLine);

        // 🔹 **Stile del percorso**
        const routeStyle = new Style({
          stroke: new Stroke({
            color: this.getRandomColor(),
            width: 4
          })
        });

        routeFeature.setStyle(routeStyle);

        // 🔹 **Crea un Vector Layer per il percorso**
        const routeSource = new VectorSource({
          features: [routeFeature]
        });

        const routeLayer = new VectorLayer({
          source: routeSource
        });

        this.dynamicLayers.push(routeLayer);
        this.map?.addLayer(routeLayer);

        // 🔹 **Centra la mappa sul percorso**
        const extent = routeLine.getExtent();
        this.map?.getView().fit(extent, { padding: [50, 50, 50, 50] });
        this.distanceInKmVal += (+(data.routes[0].distance / 1000).toFixed(2))
      } else {
        console.warn('Nessun percorso trovato.');
      }
    }, (error) => console.error)
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
}
