import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FooterUiComponent } from "../footer-ui/footer-ui.component";

@Component({
  selector: 'app-footer-feature',
  imports: [FooterUiComponent],
  templateUrl: './footer-feature.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './footer-feature.component.scss'
})
export class FooterFeatureComponent {

}
