import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatCardModule} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import { InputUiComponent } from "../input-ui/input-ui.component";
import { GasolatorModel, NominationSuggestModel } from '../../models';
import {
  MatSlideToggleModule
} from '@angular/material/slide-toggle';

const imports = [
  MatButtonToggleModule,
  MatSidenavModule, 
  CommonModule, 
  ReactiveFormsModule, 
  MatFormFieldModule, 
  MatInputModule, 
  MatButton, 
  InputUiComponent,
  MatCardModule,
  MatSlideToggleModule
]

@Component({
  selector: 'app-siderbar-ui',
  imports: [
    ...imports
   ],
  templateUrl: './siderbar-ui.component.html',
  styleUrl: './siderbar-ui.component.scss',
})
export class SiderbarUiComponent {

  public formSignal = input<FormGroup>();
  public fromFormControlName = input<string>();
  public toFormControlName = input<string>();
  public itineraryForm = input<FormGroup>();
  public intermediateStopsForm = input<FormArray>();
  public intermediateStopsFormName = input<string>();
  public selectKmTypeName = input<string>();
  public costKmLFormControlName = input<string>();
  public costLKmFormControlName = input<string>();
  public costForDayControlName = input<string>();
  public roundTripControlName = input<string>();
  public fuelCostControlName = input<string>();
  public mapFormControlNameNominationSuggest =input<{[key: string | number]: NominationSuggestModel[]}>();


  protected exceuteCalculate = output<GasolatorModel>();
  protected changeKmCountType = output<'kmL' | 'lKm'>();
  protected addStop = output<void>();



  onSubmit(): void {
    const formValue = this.formSignal()?.value;
    this.exceuteCalculate.emit(formValue);
  }
}
