import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-header-ui',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './header-ui.component.html',
  styleUrl: './header-ui.component.scss'
})
export class HeaderUiComponent {

}
