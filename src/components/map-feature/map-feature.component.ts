import { Component, OnInit } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Icon, Style } from 'ol/style';
import { Vector as VectorLayer } from 'ol/layer'
import { Vector as VectorSource } from 'ol/source'; // Importazione per VectorSource

@Component({
  selector: 'app-map-feature',
  imports: [],
  templateUrl: './map-feature.component.html',
  styleUrl: './map-feature.component.scss'
})
export class MapFeatureComponent implements OnInit{

  map?: Map;

  ngOnInit(): void {
    this.initializeMap();
  }
  
  initializeMap(): void {
    // Layer di base con OpenStreetMap
    const osmLayer = new TileLayer({
      source: new OSM()
    });

    // Inizializza la mappa con una posizione di fallback (es. Roma)
    this.map = new Map({
      target: 'map', // ID dell'elemento HTML dove la mappa sarà inserita
      layers: [osmLayer],
      view: new View({
        center: fromLonLat([12.4964, 41.9028]), // Roma come posizione di fallback
        zoom: 12
      })
    });

    // Ottieni la posizione dell'utente
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const userLon = position.coords.longitude;
        const userLat = position.coords.latitude;

        // Centra la mappa sulla posizione dell'utente
        this.map?.getView().setCenter(fromLonLat([userLon, userLat]));

        // Crea una Feature con una geometria Point per il marker
        const userLocation = new Feature({
          geometry: new Point(fromLonLat([userLon, userLat]))
        });

        // Crea uno stile per il marker
        const userLocationStyle = new Style({
          image: new Icon({
            src: 'gasolator_logo.png', // Puoi cambiare l'URL dell'icona
            scale: .15 // Scala per ridurre la dimensione dell'icona
          })
        });

        // Applica lo stile al marker
        userLocation.setStyle(userLocationStyle);

        // Aggiungi il marker alla mappa
        const vectorSource = new VectorSource({
          features: [userLocation]
        });

        const vectorLayer = new VectorLayer({
          source: vectorSource
        });

        this.map?.addLayer(vectorLayer);

      }, (error) => {
        console.error("Errore geolocalizzazione: ", error);
      });
    } else {
      alert("Geolocalizzazione non supportata dal browser.");
    }
  }

}
