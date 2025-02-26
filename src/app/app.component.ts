import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderFeatureComponent } from "../components/header-feature/header-feature.component";
import { FooterFeatureComponent } from "../components/footer-feature/footer-feature.component";

@Component({
  selector: 'app-root',
  imports: [HeaderFeatureComponent, FooterFeatureComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'gasolator';
}
