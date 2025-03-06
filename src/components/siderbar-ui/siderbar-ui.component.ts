import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatCardModule} from '@angular/material/card';

import {MatButton} from '@angular/material/button';
import { InputUiComponent } from "../input-ui/input-ui.component";

const imports = [
  MatButtonToggleModule,
  MatSidenavModule, 
  CommonModule, 
  ReactiveFormsModule, 
  MatFormFieldModule, 
  MatInputModule, 
  MatButton, 
  InputUiComponent,
  MatCardModule
]

@Component({
  selector: 'app-siderbar-ui',
  imports: [
    ...imports
   ],
  templateUrl: './siderbar-ui.component.html',
  styleUrl: './siderbar-ui.component.scss'
})
export class SiderbarUiComponent {

  public formSignal = input<FormGroup>();
  public fromFormControlName = input<string>();
  public toFormControlName = input<string>();
  public selectKmTypeName = input<string>();
  public costKmLFormControlName = input<string>();
  public costLKmFormControlName = input<string>();
  public costForDayControlName = input<string>();
  public fuelCostControlName = input<string>();


  protected exceuteCalculate = output<any>();
  protected changeKmCountType = output<'kmL' | 'lKm'>();

  onSubmit(): void {
    const formValue = this.formSignal()?.value;
    console.log(formValue);
    this.exceuteCalculate.emit(formValue);
  }
}
