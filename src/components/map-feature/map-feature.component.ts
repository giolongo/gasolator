
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, effect, inject, input, output } from '@angular/core';
import { Feature, Overlay } from 'ol';
import { Coordinate } from 'ol/coordinate';
import Map from 'ol/Map';
import View from 'ol/View';
import { createEmpty, extend, Extent } from 'ol/extent';
import { Circle as CircleGeometry, LineString, Point } from 'ol/geom';
import { Vector as VectorLayer } from 'ol/layer';
import TileLayer from 'ol/layer/Tile';
import { fromLonLat } from 'ol/proj';
import { Vector as VectorSource } from 'ol/source';
import OSM from 'ol/source/OSM';
import { Circle as CircleStyle, Fill, Icon, Stroke, Style } from 'ol/style';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { FuelAreaSearch, FuelPrice, FuelSearchRequest, FuelStation, FuelType, OsrmRoute, RouteMetrics } from '../../models';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RestService } from '../../services/rest.service';

@Component({
  selector: 'app-map-feature',
  imports: [TranslateModule],
  templateUrl: './map-feature.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./map-feature.component.scss']
})
export class MapFeatureComponent implements AfterViewInit, OnDestroy {

  @ViewChild('mapTarget', { static: true }) private mapTarget!: ElementRef<HTMLDivElement>;

  public isGone$ = new BehaviorSubject<boolean>(true);

  private restService = inject(RestService);
  private translate = inject(TranslateService);

  private combinedExtent: Extent = createEmpty();

  private dynamicLayers: VectorLayer<VectorSource>[] = [];
  private routeAnimationIds = new Set<number>();
  private currentLocationLayer?: VectorLayer<VectorSource>;
  private currentLocationOverlay?: Overlay;
  private currentLocationOverlayLangSub?: Subscription;
  private fuelStationOverlays: Overlay[] = [];
  private routeRequestId = 0;
  private activeAreaSearch?: FuelAreaSearch;
  private currentUserPosition?: { lat: number; lon: number };
  private loadedFuelStations: FuelStation[] = [];
  private loadedFuelType: FuelType = 'petrol';
  private loadedRouteMetrics: RouteMetrics | null = null;
  private fuelMarkersEnabled = false;
  protected selectedFuelStation?: FuelStation;
  protected selectedFuelType: FuelType = 'petrol';
  protected availableFuelBrands: string[] = [];
  protected selectedFuelBrands: string[] = [];
  protected isFuelBrandFilterCollapsed = true;
  protected fuelBrandFilterPosition?: { x: number; y: number };
  private fuelBrandFilterMovedByUser = false;
  private mapResizeObserver?: ResizeObserver;

  coordinate = input<FuelSearchRequest>();


  routeMetrics = output<RouteMetrics>();

  map?: Map;

  protected showRouteDirectionControl(): boolean {
    const request = this.coordinate();
    return request?.mode === 'route' && request.isRoundTrip;
  }

  constructor() {
    effect(() => {
      this.routeMetrics.emit(this.emptyRouteMetrics());
      const request = this.coordinate();
      if (!request) return;
      const requestId = ++this.routeRequestId;

      if (request.mode === 'area') {
        this.initializeAreaSearch(request, requestId);
        return;
      }

      if (!request.coordinate.from || !request.coordinate.to) return;

      this.removeDynamicLayers();
      this.resetFuelStationFilters();
      this.activeAreaSearch = undefined;
      const outboundPoints = [
        request.coordinate.from,
        ...(request.coordinate.intermediateStops ?? []),
        request.coordinate.to,
      ];
      const routeRequests = [this.restService.getOsrmRoute(outboundPoints)];

      if (request.isRoundTrip) {
        routeRequests.push(this.restService.getOsrmRoute([...outboundPoints].reverse()));
      }

      outboundPoints.slice(0, -1).forEach((point, index) => {
        const nextPoint = outboundPoints[index + 1];
        this.addMarkers(+point.lon, +point.lat, +nextPoint.lon, +nextPoint.lat);
      });

      combineLatest(routeRequests).subscribe((routes) => {
        if (requestId !== this.routeRequestId) return;
        routes.forEach((route, index) => this.drawCalculatedRoute(route, index === 0));
        this.map?.getView().fit(this.combinedExtent, { padding: [50, 50, 50, 50] });
        this.showGoneOrReturn();
        const metrics = this.aggregateRouteMetrics(routes);
        this.routeMetrics.emit(metrics);

        if (!request.showFuelStations) {
          this.setLoadedFuelStations([], request.fuelType, { ...metrics, fuelStationsCount: 0 }, false);
          this.combinedExtent = createEmpty();
          return;
        }

        const routeCoordinates = routes.flatMap(response => {
          const geometry = response.routes?.[0]?.geometry;
          return geometry ? this.decodePolyline(geometry) : [];
        });

        this.selectedFuelType = request.fuelType;
        this.restService.getFuelStations(routeCoordinates).subscribe(stations => {
          if (requestId !== this.routeRequestId) return;
          const visibleStations = stations.filter(station => this.hasSelectedFuel(station, request.fuelType));
          this.setLoadedFuelStations(visibleStations, request.fuelType, metrics, true);
        });
        this.combinedExtent = createEmpty();
      });
    })
  }

  private emptyRouteMetrics(): RouteMetrics {
    return {
      distanceKm: 0,
      durationMinutes: 0,
      routeWarnings: [],
      fuelStationsCount: null
    };
  }

  ngAfterViewInit(): void {
    // 🔹 **Layer di base con OpenStreetMap**
    const osmLayer = new TileLayer({
      source: new OSM()
    });

    this.initializeMapWhenVisible(osmLayer);

    this.isGone$.subscribe(() => {
      this.showGoneOrReturn();
    });
  }

  ngOnDestroy(): void {
    this.mapResizeObserver?.disconnect();
    this.map?.setTarget(undefined);
  }

  private initializeMapWhenVisible(osmLayer: TileLayer<OSM>, attempts = 0): void {
    const target = this.mapTarget.nativeElement;
    const { width, height } = target.getBoundingClientRect();

    if ((width === 0 || height === 0) && attempts < 20) {
      requestAnimationFrame(() => this.initializeMapWhenVisible(osmLayer, attempts + 1));
      return;
    }

    this.map = new Map({
      target,
      layers: [osmLayer],
      view: new View({
        center: fromLonLat([12.4964, 41.9028]),
        zoom: 12
      })
    });

    this.mapResizeObserver = new ResizeObserver(() => this.map?.updateSize());
    this.mapResizeObserver.observe(target);
    requestAnimationFrame(() => this.map?.updateSize());

    this.map.once('rendercomplete', () => {
      this.centerOnUserLocation();
    });
  }

  private updateCurrentLocationMarker(userLon: number, userLat: number): void {
    const currentLocation = new Feature({
      geometry: new Point(fromLonLat([userLon, userLat]))
    });

    const currentLocationStyle = new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({ color: '#1976d2' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 })
      })
    });

    currentLocation.setStyle(currentLocationStyle);

    const vectorSource = new VectorSource({
      features: [currentLocation]
    });

    if (this.currentLocationLayer) {
      this.map?.removeLayer(this.currentLocationLayer);
    }

    this.currentLocationLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 100
    });

    this.map?.addLayer(this.currentLocationLayer);
    this.updateCurrentLocationOverlay(userLon, userLat);
  }

  private updateCurrentLocationOverlay(userLon: number, userLat: number): void {
    const overlayElement = document.createElement('div');
    overlayElement.className = 'current-location-tooltip';
    overlayElement.style.padding = '4px 8px';
    overlayElement.style.backgroundColor = 'rgba(25, 118, 210, 0.9)';
    overlayElement.style.color = '#fff';
    overlayElement.style.borderRadius = '4px';
    overlayElement.style.fontSize = '0.75rem';
    overlayElement.style.whiteSpace = 'nowrap';

    if (this.currentLocationOverlayLangSub) {
      this.currentLocationOverlayLangSub.unsubscribe();
      this.currentLocationOverlayLangSub = undefined;
    }
    this.currentLocationOverlayLangSub = this.translate.stream('MAP.CURRENT_LOCATION').subscribe((val) => {
      overlayElement.textContent = val;
    });

    if (this.currentLocationOverlay) {
      this.map?.removeOverlay(this.currentLocationOverlay);
      if (this.currentLocationOverlayLangSub) {
        this.currentLocationOverlayLangSub.unsubscribe();
        this.currentLocationOverlayLangSub = undefined;
      }
    }

    this.currentLocationOverlay = new Overlay({
      element: overlayElement,
      position: fromLonLat([userLon, userLat]),
      offset: [0, -25],
      positioning: 'bottom-center',
      stopEvent: false
    });

    this.map?.addOverlay(this.currentLocationOverlay);
  }

  private centerOnUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const userLon = position.coords.longitude;
        const userLat = position.coords.latitude;
        this.currentUserPosition = { lat: userLat, lon: userLon };
        this.map?.getView().setCenter(fromLonLat([userLon, userLat]));
        this.updateCurrentLocationMarker(userLon, userLat);
      }, (error) => {
        console.error("Errore geolocalizzazione:", error);
      });
    } else {
      console.warn("Geolocalizzazione non supportata.");
    }
  }

  private initializeAreaSearch(request: FuelAreaSearch, requestId: number): void {
    this.removeDynamicLayers();
    this.selectedFuelType = request.fuelType;
    this.activeAreaSearch = request;

    if (request.center) {
      this.runAreaSearch({ ...request, center: request.center }, requestId, true);
      return;
    }

    if (this.currentUserPosition) {
      this.runAreaSearch({ ...request, center: this.currentUserPosition }, requestId, true);
      return;
    }

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(position => {
      if (requestId !== this.routeRequestId) return;
      const center = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
      this.currentUserPosition = center;
      this.updateCurrentLocationMarker(center.lon, center.lat);
      this.runAreaSearch({ ...request, center }, requestId, true);
    });
  }

  private runAreaSearch(request: FuelAreaSearch & { center: { lat: number; lon: number } }, requestId: number, fitView: boolean): void {
    this.removeDynamicLayers();
    this.resetFuelStationFilters();
    this.selectedFuelType = request.fuelType;
    this.activeAreaSearch = request;
    this.drawAreaSearch(request.center, request.radiusMeters);

    if (fitView) {
      this.map?.getView().animate({
        center: fromLonLat([request.center.lon, request.center.lat]),
        duration: 180,
        zoom: this.getZoomForRadius(request.radiusMeters)
      });
    }

    this.restService.getFuelStationsAround(request.center, request.radiusMeters).subscribe(stations => {
      if (requestId !== this.routeRequestId) return;
      const visibleStations = stations.filter(station => this.hasSelectedFuel(station, request.fuelType));
      this.setLoadedFuelStations(visibleStations, request.fuelType, {
        distanceKm: 0,
        durationMinutes: 0,
        routeWarnings: [],
        fuelStationsCount: null
      }, true);
    });
  }

  private drawAreaSearch(center: { lat: number; lon: number }, radiusMeters: number): void {
    const centerCoordinate = fromLonLat([center.lon, center.lat]);
    const projectedRadius = radiusMeters / Math.cos(center.lat * Math.PI / 180);
    const circleFeature = new Feature({
      geometry: new CircleGeometry(centerCoordinate, projectedRadius)
    });
    circleFeature.setStyle(new Style({
      fill: new Fill({ color: 'rgba(25, 118, 210, 0.12)' }),
      stroke: new Stroke({ color: '#1976d2', width: 2 })
    }));

    const centerFeature = new Feature({
      geometry: new Point(centerCoordinate)
    });
    centerFeature.setStyle(new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: '#1976d2' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 })
      })
    }));

    const areaLayer = new VectorLayer({
      source: new VectorSource({ features: [circleFeature, centerFeature] }),
      zIndex: 60
    });
    this.dynamicLayers.push(areaLayer);
    this.map?.addLayer(areaLayer);
  }

  private getZoomForRadius(radiusMeters: number): number {
    const radius = Math.max(radiusMeters, 1);
    return Math.max(8, Math.min(19, 20 - Math.log2(radius / 25)));
  }

  private aggregateRouteMetrics(routes: OsrmRoute[]): RouteMetrics {
    return {
      distanceKm: routes.reduce((sum, response) => sum + (response.routes?.[0]?.distance ?? 0), 0) / 1000,
      durationMinutes: Math.round(routes.reduce((sum, response) => sum + (response.routes?.[0]?.duration ?? 0), 0) / 60),
      routeWarnings: ['MAP.WARNING_OSRM'],
      fuelStationsCount: null
    };
  }

  private drawCalculatedRoute(response: OsrmRoute, isGone: boolean): void {
    const route = response.routes?.[0];
    if (!route?.geometry) return;

    const color = isGone ? '#1f6f49' : '#1976d2';
    const allCoordinates = this.decodePolyline(route.geometry).map(coordinate => fromLonLat(coordinate));
    if (allCoordinates.length < 2) return;

    const routeLine = new LineString(allCoordinates);
    const routeFeature = new Feature(routeLine);
    routeFeature.setStyle(new Style({ stroke: new Stroke({ color, width: 4 }) }));
    const routeLayer = new VectorLayer({
      source: new VectorSource({ features: [routeFeature] }),
      properties: { isGone }
    });

    this.dynamicLayers.push(routeLayer);
    this.map?.addLayer(routeLayer);
    this.combinedExtent = extend(this.combinedExtent, routeLine.getExtent());

    this.addAnimatedCar(routeLine, isGone);
  }

  removeDynamicLayers(): void {
    if (this.map) {
      this.routeAnimationIds.forEach(animationId => cancelAnimationFrame(animationId));
      this.routeAnimationIds.clear();
      this.dynamicLayers.forEach(layer => this.map?.removeLayer(layer));
      this.dynamicLayers = []; // Svuota l'array
      this.removeFuelStationMarkers();
      this.selectedFuelStation = undefined;
    }
  }

  private resetFuelStationFilters(): void {
    this.loadedFuelStations = [];
    this.loadedRouteMetrics = null;
    this.fuelMarkersEnabled = false;
    this.availableFuelBrands = [];
    this.selectedFuelBrands = [];
    this.isFuelBrandFilterCollapsed = true;
    this.fuelBrandFilterPosition = undefined;
    this.fuelBrandFilterMovedByUser = false;
  }

  private removeFuelStationMarkers(): void {
    this.fuelStationOverlays.forEach(overlay => this.map?.removeOverlay(overlay));
    this.fuelStationOverlays = [];
  }

  private setLoadedFuelStations(stations: FuelStation[], fuelType: FuelType, metrics: RouteMetrics, markersEnabled: boolean): void {
    this.loadedFuelStations = stations;
    this.loadedFuelType = fuelType;
    this.selectedFuelType = fuelType;
    this.loadedRouteMetrics = metrics;
    this.fuelMarkersEnabled = markersEnabled;
    this.availableFuelBrands = this.getAvailableFuelBrands(stations);
    this.selectedFuelBrands = [...this.availableFuelBrands];
    this.isFuelBrandFilterCollapsed = true;
    this.refreshFuelStationMarkers();
  }

  private refreshFuelStationMarkers(): void {
    const filteredStations = this.getFilteredFuelStations();

    if (this.fuelMarkersEnabled) {
      this.addFuelStationMarkers(filteredStations, this.loadedFuelType);
    } else {
      this.removeFuelStationMarkers();
    }

    if (this.loadedRouteMetrics) {
      this.routeMetrics.emit({
        ...this.loadedRouteMetrics,
        fuelStationsCount: this.fuelMarkersEnabled ? filteredStations.length : 0
      });
    }
  }

  protected showFuelBrandFilter(): boolean {
    return this.fuelMarkersEnabled && this.availableFuelBrands.length > 0;
  }

  protected isFuelBrandSelected(brand: string): boolean {
    return this.selectedFuelBrands.includes(brand);
  }

  protected get selectedFuelBrandCount(): number {
    return this.selectedFuelBrands.length;
  }

  protected toggleFuelBrandFilter(panel: HTMLElement): void {
    const willOpen = this.isFuelBrandFilterCollapsed;
    this.isFuelBrandFilterCollapsed = !this.isFuelBrandFilterCollapsed;

    if (!willOpen && !this.fuelBrandFilterMovedByUser) {
      this.fuelBrandFilterPosition = undefined;
      panel.style.left = '';
      panel.style.top = '';
      panel.style.bottom = '';
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => this.fitFuelBrandFilterInViewport(panel));
    });
  }

  private fitFuelBrandFilterInViewport(panel: HTMLElement): void {
    const container = panel.parentElement as HTMLElement | null;
    if (!container) return;

    const margin = 12;
    const containerRect = container.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const maxX = Math.max(margin, containerRect.width - panel.offsetWidth - margin);
    const maxY = Math.max(margin, containerRect.height - panel.offsetHeight - margin);
    const currentX = this.fuelBrandFilterMovedByUser
      ? this.fuelBrandFilterPosition?.x ?? panelRect.left - containerRect.left
      : margin;
    const currentY = this.fuelBrandFilterMovedByUser
      ? this.fuelBrandFilterPosition?.y ?? panelRect.top - containerRect.top
      : maxY;
    const x = Math.max(margin, Math.min(maxX, currentX));
    const y = Math.max(margin, Math.min(maxY, currentY));

    this.fuelBrandFilterPosition = { x, y };
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.bottom = 'auto';
  }

  protected startFuelBrandFilterDrag(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const handle = event.currentTarget as HTMLElement;
    const panel = handle.closest('.fuel-brand-filter') as HTMLElement | null;
    const container = panel?.parentElement as HTMLElement | null;
    if (!panel || !container) return;

    const panelRect = panel.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const pointerOffsetX = event.clientX - panelRect.left;
    const pointerOffsetY = event.clientY - panelRect.top;
    this.fuelBrandFilterMovedByUser = true;

    const movePanel = (moveEvent: PointerEvent) => {
      const maxX = Math.max(0, containerRect.width - panel.offsetWidth);
      const maxY = Math.max(0, containerRect.height - panel.offsetHeight);
      const x = Math.max(0, Math.min(maxX, moveEvent.clientX - containerRect.left - pointerOffsetX));
      const y = Math.max(0, Math.min(maxY, moveEvent.clientY - containerRect.top - pointerOffsetY));
      this.fuelBrandFilterPosition = { x, y };
      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
      panel.style.bottom = 'auto';
    };

    const stopDrag = () => {
      window.removeEventListener('pointermove', movePanel);
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
    };

    window.addEventListener('pointermove', movePanel);
    window.addEventListener('pointerup', stopDrag, { once: true });
    window.addEventListener('pointercancel', stopDrag, { once: true });
  }

  protected onFuelBrandToggle(brand: string, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const checked = target?.checked ?? false;

    if (checked) {
      this.selectedFuelBrands = Array.from(new Set([...this.selectedFuelBrands, brand]));
    } else {
      this.selectedFuelBrands = this.selectedFuelBrands.filter(selectedBrand => selectedBrand !== brand);
    }

    this.refreshFuelStationMarkers();
  }

  protected selectAllFuelBrands(): void {
    this.selectedFuelBrands = [...this.availableFuelBrands];
    this.refreshFuelStationMarkers();
  }

  protected deselectAllFuelBrands(): void {
    this.selectedFuelBrands = [];
    this.refreshFuelStationMarkers();
  }

  protected getFuelBrandColor(brand: string): string {
    return this.getBrandColor(brand);
  }

  protected getFuelBrandIconPath(brand: string): string | undefined {
    return this.getFuelBrandIconPathByLabel(brand);
  }

  private getFilteredFuelStations(): FuelStation[] {
    if (!this.selectedFuelBrands.length) return [];

    const selectedBrands = new Set(this.selectedFuelBrands);
    return this.loadedFuelStations.filter(station => selectedBrands.has(this.getFullBrandLabel(station)));
  }

  private getAvailableFuelBrands(stations: FuelStation[]): string[] {
    return Array.from(new Set(stations.map(station => this.getFullBrandLabel(station))))
      .sort((first, second) => first.localeCompare(second, 'it'));
  }

  private addFuelStationMarkers(stations: FuelStation[], fuelType: FuelType): void {
    this.removeFuelStationMarkers();
    const bestPrice = this.getBestVisibleFuelPrice(stations, fuelType);
    const sortedStations = [...stations].sort((first, second) => {
      const firstIsBest = this.isBestVisibleFuelStation(first, fuelType, bestPrice);
      const secondIsBest = this.isBestVisibleFuelStation(second, fuelType, bestPrice);
      return Number(firstIsBest) - Number(secondIsBest);
    });

    sortedStations.forEach(station => {
      const isBestStation = this.isBestVisibleFuelStation(station, fuelType, bestPrice);
      const baseZIndex = isBestStation ? 2500 : 1200;
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.title = station.name;
      marker.setAttribute('aria-label', `${this.translate.instant('MAP.FUEL_STATION')}: ${station.name}`);
      const brandLabel = this.getFullBrandLabel(station);
      const brand = document.createElement('strong');
      const brandIconPath = this.getFuelBrandIconPathByLabel(brandLabel);
      if (brandIconPath) {
        const logo = document.createElement('img');
        logo.src = brandIconPath;
        logo.alt = brandLabel;
        brand.append(logo);
      } else {
        brand.textContent = this.getBrandLabel(station);
      }
      if (isBestStation) {
        const bestBadge = document.createElement('small');
        bestBadge.textContent = '★';
        brand.append(bestBadge);
      }
      const price = document.createElement('span');
      price.textContent = this.getMarkerPrice(station, fuelType);
      marker.append(brand, price);
      Object.assign(marker.style, {
        width: isBestStation ? '88px' : '64px',
        height: isBestStation ? '58px' : '42px',
        padding: '4px 5px',
        border: isBestStation ? '3px solid #ffffff' : '2px solid #ffffff',
        borderRadius: isBestStation ? '9px' : '7px',
        background: isBestStation ? '#1976d2' : this.getFuelBrandColor(this.getFullBrandLabel(station)),
        color: '#ffffff',
        boxShadow: isBestStation ? '0 10px 26px rgba(25,118,210,.55), 0 0 0 7px rgba(25,118,210,.18)' : '0 2px 7px rgba(0,0,0,.3)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        lineHeight: '1.05',
        overflow: 'hidden',
        position: 'relative',
        transform: isBestStation ? 'translateY(-5px)' : 'none',
        zIndex: `${baseZIndex}`
      });
      Object.assign(brand.style, {
        display: 'flex',
        height: isBestStation ? '28px' : '20px',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px',
        overflow: 'hidden',
        fontSize: '11px',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      });
      const logo = brand.querySelector('img');
      if (logo) {
        Object.assign(logo.style, {
          maxWidth: isBestStation ? '58px' : '42px',
          maxHeight: isBestStation ? '24px' : '18px',
          objectFit: 'contain'
        });
      }
      const bestBadge = brand.querySelector('small');
      if (bestBadge) {
        Object.assign(bestBadge.style, {
          color: '#ffffff',
          fontSize: '12px',
          lineHeight: '1'
        });
      }
      Object.assign(price.style, {
        display: 'block',
        marginTop: brandIconPath ? '2px' : '3px',
        fontSize: isBestStation ? '13px' : '11px',
        fontWeight: '700',
        whiteSpace: 'nowrap'
      });
      if (isBestStation) {
        marker.animate([
          {
            transform: 'translateY(-5px) scale(1)',
            boxShadow: '0 10px 26px rgba(25,118,210,.55), 0 0 0 6px rgba(25,118,210,.2)'
          },
          {
            transform: 'translateY(-5px) scale(1.08)',
            boxShadow: '0 14px 32px rgba(25,118,210,.68), 0 0 0 13px rgba(25,118,210,0)'
          },
          {
            transform: 'translateY(-5px) scale(1)',
            boxShadow: '0 10px 26px rgba(25,118,210,.55), 0 0 0 6px rgba(25,118,210,.2)'
          }
        ], {
          duration: 1400,
          iterations: Infinity,
          easing: 'ease-in-out'
        });
      }
      marker.addEventListener('click', event => {
        event.stopPropagation();
        this.setFuelMarkerZIndex(marker, 3000);
        this.openFuelStationModal(station, fuelType);
      });
      marker.addEventListener('mouseenter', () => this.setFuelMarkerZIndex(marker, 3000));
      marker.addEventListener('focus', () => this.setFuelMarkerZIndex(marker, 3000));
      marker.addEventListener('mouseleave', () => this.setFuelMarkerZIndex(marker, baseZIndex));
      marker.addEventListener('blur', () => this.setFuelMarkerZIndex(marker, baseZIndex));

      const overlay = new Overlay({
        element: marker,
        position: fromLonLat([station.lon, station.lat]),
        positioning: 'center-center',
        stopEvent: true
      });
      overlay.set('fuelStationZIndex', baseZIndex);
      this.fuelStationOverlays.push(overlay);
      this.map?.addOverlay(overlay);
      this.setFuelMarkerZIndex(marker, baseZIndex);
    });
  }

  private setFuelMarkerZIndex(marker: HTMLButtonElement, zIndex: number): void {
    marker.style.zIndex = `${zIndex}`;
    if (marker.parentElement) {
      marker.parentElement.style.zIndex = `${zIndex}`;
    }
  }

  protected openFuelStationModal(station: FuelStation, fuelType: FuelType): void {
    this.selectedFuelType = fuelType;
    this.selectedFuelStation = station;
  }

  protected closeFuelStationModal(): void {
    this.selectedFuelStation = undefined;
  }

  protected getSelectedFuelPrice(station: FuelStation): FuelPrice | undefined {
    return station.prices.find(price => price.type === this.selectedFuelType);
  }

  protected getFuelTypeLabel(type: FuelType): string {
    return this.translate.instant(`MAP.FUEL_TYPES.${type.toUpperCase()}`);
  }

  protected getFuelStationUpdatedAt(station: FuelStation): string | undefined {
    return station.prices.find(price => price.updatedAt)?.updatedAt;
  }

  protected openFuelStationInGoogleMaps(station: FuelStation): void {
    window.open(this.buildFuelStationGoogleMapsUrl(station), '_blank', 'noopener,noreferrer');
  }

  protected async shareFuelStation(station: FuelStation): Promise<void> {
    const price = this.getSelectedFuelPrice(station);
    const url = this.buildFuelStationGoogleMapsUrl(station);
    const text = [
      station.name,
      station.address,
      `${this.getFuelTypeLabel(this.selectedFuelType)}: ${price ? this.getPriceText(price) : this.translate.instant('MAP.NOT_AVAILABLE')}`
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: station.name,
          text,
          url
        });
        return;
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') return;
      }
    }

    await navigator.clipboard.writeText(`${text}\n${url}`);
  }

  private getBrandLabel(station: FuelStation): string {
    const value = this.getFullBrandLabel(station);
    return value.length <= 9 ? value : value.slice(0, 8);
  }

  private getFuelBrandIconPathByLabel(brand: string): string | undefined {
    const brandKey = brand.toLowerCase();
    const iconName = [
      ['eni', 'eni.png'],
      ['esso', 'esso.svg'],
      ['tamoil', 'tamoil.svg'],
      ['ip', 'ip.svg']
    ].find(([match]) => brandKey.includes(match))?.[1];

    return iconName ? `fuel-brands/${iconName}` : undefined;
  }

  private getFullBrandLabel(station: FuelStation): string {
    const value = (station.brand || station.name).trim();
    const knownBrand = [
      ['agip', 'Eni'],
      ['eni', 'Eni'],
      ['q8', 'Q8'],
      ['esso', 'Esso'],
      ['tamoil', 'Tamoil'],
      ['ip', 'IP'],
      ['api', 'IP'],
      ['pompe bianche', 'PB']
    ].find(([match]) => value.toLowerCase().includes(match));
    if (knownBrand) return knownBrand[1];
    return value || this.translate.instant('MAP.UNKNOWN_BRAND');
  }

  private hasSelectedFuel(station: FuelStation, fuelType: FuelType): boolean {
    return station.prices.some(price => price.type === fuelType);
  }

  private getBestVisibleFuelPrice(stations: FuelStation[], fuelType: FuelType): number | undefined {
    const prices = stations
      .map(station => station.prices.find(price => price.type === fuelType)?.price)
      .filter((price): price is number => price != null);
    if (!prices.length) return undefined;

    return Math.min(...prices);
  }

  private isBestVisibleFuelStation(station: FuelStation, fuelType: FuelType, bestPrice?: number): boolean {
    if (bestPrice == null) return false;
    return station.prices.find(price => price.type === fuelType)?.price === bestPrice;
  }

  private getMarkerPrice(station: FuelStation, fuelType: FuelType): string {
    const primaryPrice = station.prices.find(price => price.type === fuelType);
    if (primaryPrice?.price) return `€ ${primaryPrice.price.toFixed(3)}`;

    if (primaryPrice?.displayPrice) return primaryPrice.displayPrice.length <= 10 ? primaryPrice.displayPrice : primaryPrice.displayPrice.slice(0, 9);
    if (primaryPrice?.price === 0) return this.translate.instant('MAP.FREE');
    return this.translate.instant('MAP.NOT_AVAILABLE');
  }

  protected getPriceText(price: FuelPrice): string {
    if (price.displayPrice) return price.displayPrice;
    if (price.price === 0) return this.translate.instant('MAP.FREE');
    if (price.price == null) return this.translate.instant('MAP.NOT_AVAILABLE');

    const unit = price.type === 'methane' ? 'kg' : 'l';
    return `€ ${price.price.toFixed(3)}/${unit}`;
  }

  private getBrandColor(brand: string): string {
    const palette = ['#176b45', '#a82f2f', '#185b85', '#5d4b8a', '#0f6b70', '#765220'];
    const hash = [...brand].reduce((value, character) => value + character.charCodeAt(0), 0);
    return palette[hash % palette.length];
  }

  private buildFuelStationGoogleMapsUrl(station: FuelStation): string {
    const params = new URLSearchParams({
      api: '1',
      query: `${station.lat},${station.lon}`
    });
    return `https://www.google.com/maps/search/?${params.toString()}`;
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

  showGoneOrReturn() {
    this.map?.getLayers().forEach(l => {
      const isGoneProperties = l.getProperties()['isGone']
      if (isGoneProperties != null) {
        l.setZIndex(isGoneProperties !== this.isGone$.value ? -1 : 50)
      }
    });
  }

  private addAnimatedCar(routeLine: LineString, isGone: boolean): void {
    const routeCoordinates = routeLine.getCoordinates();
    const routeMeasure = this.getRouteMeasure(routeCoordinates);

    if (routeCoordinates.length < 2 || routeMeasure.totalLength === 0) {
      return;
    }

    const carFeature = new Feature({
      geometry: new Point(routeCoordinates[0])
    });

    const carIcon = new Icon({
      src: 'car.gif',
      scale: 0.18,
      rotation: this.getBearing(routeCoordinates[0], routeCoordinates[1]),
      rotateWithView: true
    });

    carFeature.setStyle(new Style({ image: carIcon }));

    const carSource = new VectorSource({
      features: [carFeature]
    });

    const carLayer = new VectorLayer({
      source: carSource,
      properties: { isGone }
    });

    carLayer.setZIndex(75);
    this.dynamicLayers.push(carLayer);
    this.map?.addLayer(carLayer);

    const animationDuration = Math.min(32000, Math.max(10000, routeMeasure.totalLength / 28));
    const startTime = performance.now();
    let animationId = 0;

    const animate = (time: number) => {
      this.routeAnimationIds.delete(animationId);
      const progress = ((time - startTime) % animationDuration) / animationDuration;
      const current = this.getCoordinateAtDistance(routeCoordinates, routeMeasure.cumulativeLengths, routeMeasure.totalLength * progress);
      const next = this.getCoordinateAtDistance(
        routeCoordinates,
        routeMeasure.cumulativeLengths,
        routeMeasure.totalLength * ((progress + 0.003) % 1)
      );
      const geometry = carFeature.getGeometry();

      if (geometry instanceof Point) {
        geometry.setCoordinates(current);
      }

      carIcon.setRotation(this.getBearing(current, next));
      carFeature.changed();

      animationId = requestAnimationFrame(animate);
      this.routeAnimationIds.add(animationId);
    };

    animationId = requestAnimationFrame(animate);
    this.routeAnimationIds.add(animationId);
  }

  private getRouteMeasure(coordinates: Coordinate[]): { cumulativeLengths: number[], totalLength: number } {
    const cumulativeLengths = [0];

    for (let i = 1; i < coordinates.length; i++) {
      cumulativeLengths.push(
        cumulativeLengths[i - 1] + this.getSegmentLength(coordinates[i - 1], coordinates[i])
      );
    }

    return {
      cumulativeLengths,
      totalLength: cumulativeLengths[cumulativeLengths.length - 1]
    };
  }

  private getCoordinateAtDistance(coordinates: Coordinate[], cumulativeLengths: number[], distance: number): Coordinate {
    const totalLength = cumulativeLengths[cumulativeLengths.length - 1];
    const targetDistance = Math.max(0, Math.min(distance, totalLength));
    let endIndex = cumulativeLengths.findIndex(length => length >= targetDistance);

    if (endIndex <= 0) {
      endIndex = 1;
    }

    const startIndex = endIndex - 1;
    const segmentLength = cumulativeLengths[endIndex] - cumulativeLengths[startIndex];
    const segmentProgress = segmentLength === 0
      ? 0
      : (targetDistance - cumulativeLengths[startIndex]) / segmentLength;
    const start = coordinates[startIndex];
    const end = coordinates[endIndex];

    return [
      start[0] + (end[0] - start[0]) * segmentProgress,
      start[1] + (end[1] - start[1]) * segmentProgress
    ];
  }

  private getSegmentLength(from: Coordinate, to: Coordinate): number {
    return Math.hypot(to[0] - from[0], to[1] - from[1]);
  }

  private getBearing(from: Coordinate, to: Coordinate): number {
    return Math.atan2(to[1] - from[1], to[0] - from[0]);
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} ${this.translate.instant('MAP.MIN')}`;
    }

    return `${hours} ${this.translate.instant('MAP.HOUR')} ${remainingMinutes.toString().padStart(2, '0')} ${this.translate.instant('MAP.MIN')}`;
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
