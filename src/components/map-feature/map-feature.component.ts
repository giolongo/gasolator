import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-map-feature',
  templateUrl: './map-feature.component.html',
  styleUrls: ['./map-feature.component.scss']
})
export class MapFeatureComponent implements OnInit {
  map?: Map;

  ngOnInit(): void {
    this.initializeMap();
  }

  initializeMap(): void {
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

    // 🔹 **Geolocalizzazione utente**
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const userLon = position.coords.longitude;
        const userLat = position.coords.latitude;

        // 🔹 **Sposta la mappa sulla posizione dell'utente**
        this.map?.getView().setCenter(fromLonLat([userLon, userLat]));

        // 🔹 **Aggiungi i marker utente e destinazione**
        this.addMarkers(userLon, userLat, 12.4964, 41.9028);

        // 🔹 **Disegna il percorso**
        this.drawRoute(userLon, userLat, [12.4964, 41.9028]);
      }, (error) => {
        console.error("Errore geolocalizzazione:", error);
      });
    } else {
      alert("Geolocalizzazione non supportata.");
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

    this.map?.addLayer(vectorLayer);
  }

  // 🔹 **Funzione per calcolare e disegnare il percorso**
  drawRoute(startLon: number, startLat: number, endLonLat: number[]): void {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLonLat[0]},${endLonLat[1]}?overview=full&geometries=polyline`;

    fetch(osrmUrl)
      .then(response => response.json())
      .then(data => {
        console.log('OSRM Response:', data);

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0].geometry;
          const coordinates = this.decodePolyline(route);

          console.log('Decoded coordinates:', coordinates);

          // 🔹 **Converti le coordinate in formato OpenLayers**
          const transformedCoordinates = coordinates.map(coord => fromLonLat(coord));

          // 🔹 **Crea la LineString del percorso**
          const routeLine = new LineString(transformedCoordinates);
          console.log('Route Line:', routeLine);

          // 🔹 **Crea un Feature per il percorso**
          const routeFeature = new Feature(routeLine);

          // 🔹 **Stile del percorso**
          const routeStyle = new Style({
            stroke: new Stroke({
              color: '#FF0000', // Rosso
              width: 5
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

          this.map?.addLayer(routeLayer);

          // 🔹 **Centra la mappa sul percorso**
          const extent = routeLine.getExtent();
          console.log('Extent of the route:', extent);
          this.map?.getView().fit(extent, { padding: [50, 50, 50, 50] });

        } else {
          console.log('Nessun percorso trovato.');
        }
      })
      .catch(error => {
        console.error('Errore nel recuperare il percorso:', error);
      });
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
}
