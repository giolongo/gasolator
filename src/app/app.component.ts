import { Component, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SwUpdate } from '@angular/service-worker';
import { FooterFeatureComponent } from "../components/footer-feature/footer-feature.component";
import { HeaderFeatureComponent } from "../components/header-feature/header-feature.component";
import { SiderbarFeatureComponent } from "../components/siderbar-feature/siderbar-feature.component";
import { MapFeatureComponent } from "../components/map-feature/map-feature.component";
import { CarLoaderComponent } from "../components/car-loader/car-loader.component";
import { RestService } from '../services/rest.service';
import { CommonModule } from '@angular/common';
import { DistanceModel, RouteMetrics, RouteSummary } from '../models';

@Component({
  selector: 'app-root',
  imports: [HeaderFeatureComponent, FooterFeatureComponent, SiderbarFeatureComponent, MatSidenavModule, MatIconModule, MatButtonModule, MapFeatureComponent, CarLoaderComponent, CommonModule, TranslateModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'gasolator';
  coordinate?: {coordinate: DistanceModel, isRoundTrip: boolean};
  routeMetrics: RouteMetrics = { distanceKm: 0, durationMinutes: 0, routeWarnings: [] };
  routeSummary?: RouteSummary;
  isSummaryCollapsed = false;

  private restService = inject(RestService);
  private translate = inject(TranslateService);
  private swUpdate = inject(SwUpdate);

  public isLoading$ = this.restService.inLoading;
  public updateAvailable = signal(false);

  @ViewChild('drawer', { static: true }) public drawer!: MatDrawer;

  protected openSidebarSignal = signal(false);

  updateSidebarSignal(val: boolean): void {
    this.openSidebarSignal.set(val);
  }

  constructor() {
    effect(() => {
      if (this.openSidebarSignal()) {
        this.drawer.toggle()
      }
    })
  }

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
    this.drawer.closedStart.subscribe(() => {
      this.updateSidebarSignal(false)
    })
    this.setViewportHeight();
    window.addEventListener('resize', this.setViewportHeight);
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

  calculateRoute(coordinateBean: {coordinate: DistanceModel, isRoundTrip: boolean}) {
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

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} ${this.translate.instant('MAP.MIN')}`;
    }

    return `${hours} ${this.translate.instant('MAP.HOUR')} ${remainingMinutes.toString().padStart(2, '0')} ${this.translate.instant('MAP.MIN')}`;
  }

}
