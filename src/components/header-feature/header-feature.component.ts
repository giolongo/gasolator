import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { HeaderUiComponent } from "../header-ui/header-ui.component";

@Component({
  selector: 'app-header-feature',
  imports: [HeaderUiComponent],
  templateUrl: './header-feature.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './header-feature.component.scss'
})
export class HeaderFeatureComponent {
    openSidebar = output();

}
