import { Component, effect, inject, input, OnInit, output } from '@angular/core';
import { SiderbarUiComponent } from "../siderbar-ui/siderbar-ui.component";
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-siderbar-feature',
  imports: [SiderbarUiComponent],
  templateUrl: './siderbar-feature.component.html',
  styleUrl: './siderbar-feature.component.scss'
})
export class SiderbarFeatureComponent implements OnInit {
  private fb = inject(FormBuilder);

  public fromFormName = 'from';
  public toFormName = 'to';
  public costKmLFormControlName = 'kmL';
  public costLKmFormControlName = 'lKm';
  public selectKmTypeName = 'selectKmType';
  public costForDayControlName = 'costForDay';
  public fuelCostControlName = 'costFuel';
  public gasolatorForm?: FormGroup;
  public costKmFormControlName = this.costKmLFormControlName;

  ngOnInit(): void {
    this.gasolatorForm = this.fb.group({
      [this.fromFormName]: ['', Validators.required],
      [this.toFormName]: ['', Validators.required],
      [this.costForDayControlName]: ['', Validators.required],
      [this.selectKmTypeName]: ['kmL', Validators.required],
      [this.fuelCostControlName]: ['0', Validators.required],
      [this.costKmLFormControlName]: ['0', Validators.required],
      [this.costLKmFormControlName]: ['0'],
    });

    this.gasolatorForm.get(this.selectKmTypeName)?.valueChanges.subscribe(val => {
      if (val === 'kmL') {
        this.gasolatorForm?.get(this.costLKmFormControlName)?.clearValidators();
        this.gasolatorForm?.get(this.costKmLFormControlName)?.setValidators(Validators.required);
      } else if (val === 'lKm') {
        this.gasolatorForm?.get(this.costKmLFormControlName)?.clearValidators();
        this.gasolatorForm?.get(this.costLKmFormControlName)?.setValidators(Validators.required);
      }
      this.costKmFormControlName = val;
      this.gasolatorForm?.updateValueAndValidity();
    })
  }
}
