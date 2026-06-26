import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SwUpdate } from '@angular/service-worker';
import { FooterFeatureComponent } from "../components/footer-feature/footer-feature.component";
import { HeaderFeatureComponent } from "../components/header-feature/header-feature.component";
import { SiderbarFeatureComponent } from "../components/siderbar-feature/siderbar-feature.component";
import { MapFeatureComponent } from "../components/map-feature/map-feature.component";
import { CarLoaderComponent } from "../components/car-loader/car-loader.component";
import { RestService } from '../services/rest.service';
import { CommonModule } from '@angular/common';
import { FuelSearchRequest, RouteMetrics, RouteSummary } from '../models';

@Component({
  selector: 'app-root',
  imports: [HeaderFeatureComponent, FooterFeatureComponent, SiderbarFeatureComponent, MatSidenavModule, MatIconModule, MatButtonModule, MatTooltipModule, MapFeatureComponent, CarLoaderComponent, CommonModule, TranslateModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'gasolator';
  coordinate?: FuelSearchRequest;
  routeMetrics: RouteMetrics = {
    distanceKm: 0,
    durationMinutes: 0,
    routeWarnings: [],
    fuelStationsCount: null
  };
  routeSummary?: RouteSummary;
  isSummaryCollapsed = false;
  shareFeedback = false;

  private restService = inject(RestService);
  private translate = inject(TranslateService);
  private swUpdate = inject(SwUpdate);

  public isLoading$ = this.restService.inLoading;
  public updateAvailable = signal(false);

  @ViewChild('drawer', { static: true }) public drawer!: MatDrawer;

  ngOnInit(): void {
    // Check for PWA updates
    if (this.swUpdate.isEnabled) {
      // Check for updates every 60 seconds
      setInterval(() => {
        this.swUpdate.checkForUpdate().catch(() => {
          // Silently fail if update check fails
        });
      }, 60000);

      // Notify user when update is available
      this.swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') {
          this.updateAvailable.set(true);
          console.log('New version available. Please refresh or close and reopen the app on iOS.');
        }
      });
    }

    // default language
    this.translate.setDefaultLang('en');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        // simple Italy bounding box
        if (lon >= 6.5 && lon <= 18.6 && lat >= 36.5 && lat <= 47.1) {
          this.translate.use('it');
        } else {
          this.translate.use('en');
        }
      }, () => {
        this.translate.use('en');
      });
    } else {
      this.translate.use('en');
    }
    this.setViewportHeight();
    window.addEventListener('resize', this.setViewportHeight);
  }

  toggleSidebar(): void {
    this.drawer.toggle();
  }

  refreshApp(): void {
    if (this.swUpdate.isEnabled) {
      // On iOS, the user needs to manually close and reopen the app
      // On other platforms, reload the page
      window.location.reload();
    }
  }

  setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  calculateRoute(coordinateBean: FuelSearchRequest) {
    this.coordinate = coordinateBean
    this.routeSummary = undefined;
    this.drawer.close()
  }

  updateRouteMetrics(routeMetrics: RouteMetrics): void {
    this.routeMetrics = routeMetrics;
    if (routeMetrics.distanceKm === 0) {
      this.routeSummary = undefined;
      this.isSummaryCollapsed = false;
    }
  }

  updateRouteSummary(routeSummary: RouteSummary): void {
    this.routeSummary = routeSummary;
  }

  toggleSummary(): void {
    this.isSummaryCollapsed = !this.isSummaryCollapsed;
  }

  openInGoogleMaps(): void {
    const url = this.buildGoogleMapsUrl();
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  async shareRoute(): Promise<void> {
    const url = this.buildGoogleMapsUrl();
    if (!url) return;

    const shareData = {
      title: this.translate.instant('SHARE.TITLE'),
      text: this.translate.instant('SHARE.TEXT'),
      url
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') return;
      }
    }

    await navigator.clipboard.writeText(url);
    this.shareFeedback = true;
    window.setTimeout(() => this.shareFeedback = false, 2200);
  }

  private buildGoogleMapsUrl(): string | undefined {
    const request = this.coordinate;
    if (!request || request.mode !== 'route' || !request.coordinate.from || !request.coordinate.to) return undefined;

    const outbound = [
      request.coordinate.from,
      ...(request.coordinate.intermediateStops ?? []),
      request.coordinate.to
    ];
    const route = request.isRoundTrip
      ? [...outbound, ...outbound.slice(0, -1).reverse()]
      : outbound;
    const origin = route[0];
    const destination = route[route.length - 1];
    const waypoints = route.slice(1, -1);
    const params = new URLSearchParams({
      api: '1',
      origin: `${origin.lat},${origin.lon}`,
      destination: `${destination.lat},${destination.lon}`,
      travelmode: 'driving'
    });

    if (waypoints.length) {
      params.set('waypoints', waypoints.map(point => `${point.lat},${point.lon}`).join('|'));
    }

    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} ${this.translate.instant('MAP.MIN')}`;
    }

    return `${hours} ${this.translate.instant('MAP.HOUR')} ${remainingMinutes.toString().padStart(2, '0')} ${this.translate.instant('MAP.MIN')}`;
  }

}
