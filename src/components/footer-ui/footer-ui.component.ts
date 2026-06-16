import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-footer-ui',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, TranslateModule],
  templateUrl: './footer-ui.component.html',
  styleUrl: './footer-ui.component.scss'
})
export class FooterUiComponent {

}
