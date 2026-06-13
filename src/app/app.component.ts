import { Component, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
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
  imports: [HeaderFeatureComponent, FooterFeatureComponent, SiderbarFeatureComponent, MatSidenavModule, MapFeatureComponent, CarLoaderComponent, CommonModule],
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

  public isLoading$ = this.restService.inLoading;

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
    this.drawer.closedStart.subscribe(() => {
      this.updateSidebarSignal(false)
    })
    this.setViewportHeight();
    window.addEventListener('resize', this.setViewportHeight);
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
      return `${remainingMinutes} min`;
    }

    return `${hours} h ${remainingMinutes.toString().padStart(2, '0')} min`;
  }

}
