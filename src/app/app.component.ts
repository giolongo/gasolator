import { Component, effect, OnInit, signal, ViewChild } from '@angular/core';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { FooterFeatureComponent } from "../components/footer-feature/footer-feature.component";
import { HeaderFeatureComponent } from "../components/header-feature/header-feature.component";
import { SiderbarFeatureComponent } from "../components/siderbar-feature/siderbar-feature.component";
import { MapFeatureComponent } from "../components/map-feature/map-feature.component";

@Component({
  selector: 'app-root',
  imports: [HeaderFeatureComponent, FooterFeatureComponent, SiderbarFeatureComponent, MatSidenavModule, MapFeatureComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'gasolator';

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

}
