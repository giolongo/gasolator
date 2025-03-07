import { Component, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { FooterFeatureComponent } from "../components/footer-feature/footer-feature.component";
import { HeaderFeatureComponent } from "../components/header-feature/header-feature.component";
import { SiderbarFeatureComponent } from "../components/siderbar-feature/siderbar-feature.component";
import { MapFeatureComponent } from "../components/map-feature/map-feature.component";
import { CarLoaderComponent } from "../components/car-loader/car-loader.component";
import { RestService } from '../services/rest.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [HeaderFeatureComponent, FooterFeatureComponent, SiderbarFeatureComponent, MatSidenavModule, MapFeatureComponent, CarLoaderComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'gasolator';
  coordinate: any;

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
  }

  calculateRoute(coordinate: any) {
    this.coordinate = coordinate
  }

}
