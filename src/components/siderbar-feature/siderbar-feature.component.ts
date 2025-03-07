import { AfterViewInit, Component, computed, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { SiderbarUiComponent } from "../siderbar-ui/siderbar-ui.component";
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { RestService } from '../../services/rest.service';
import { debounceTime, filter, map, switchMap, tap } from 'rxjs';
import { autocompleteValidator } from '../../validators/autocomplete.validator';

@Component({
  selector: 'app-siderbar-feature',
  imports: [SiderbarUiComponent],
  templateUrl: './siderbar-feature.component.html',
  styleUrl: './siderbar-feature.component.scss'
})
export class SiderbarFeatureComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private restService = inject(RestService);

  protected exceuteCalculate = output<any>();
  protected travelMessage = output<string>();
  public distanceKm = input<number>();

  public fromAutocompleteSuggest: { place_id: number, display_name: string, lat: number, long: number }[] = [];
  public toAutocompleteSuggest: { place_id: number, display_name: string, lat: number, long: number }[] = [];

  public travelCost?: number;
  public fromFormName = 'from';
  public toFormName = 'to';
  public costKmLFormControlName = 'kmL';
  public costLKmFormControlName = 'lKm';
  public selectKmTypeName = 'selectKmType';
  public costForDayControlName = 'costForDay';
  public fuelCostControlName = 'costFuel';
  public gasolatorForm?: FormGroup;
  public costKmFormControlName = this.costKmLFormControlName;
  public fromLatLng?: { lat: number | string, lon: number | string };
  public toLatLng?: { lat: number | string, lon: number | string };

  constructor() {
    effect(() => {
      const distanceKmVal = this.distanceKm();
      if (distanceKmVal && distanceKmVal > 0) {
        let travelCost = 0;
        let consumption;


        const kmType = this.gasolatorForm?.get(this.selectKmTypeName)?.value;
        const costLKm = +this.gasolatorForm?.get(this.costLKmFormControlName)?.value;
        const costKmL = +this.gasolatorForm?.get(this.costKmLFormControlName)?.value;
        const fuelCost = +(this.gasolatorForm?.get(this.fuelCostControlName)?.value);
        const costForDay = +(this.gasolatorForm?.get(this.costForDayControlName)?.value);

        if (distanceKmVal) {
          if (kmType === 'lKm') {
            consumption = costLKm + 'l/100km';
            travelCost =
              +(distanceKmVal / 100).toFixed(2) *
              costLKm *
              fuelCost +
              costForDay;
          } else {
            consumption = costKmL + 'km/l';
            travelCost =
              +(distanceKmVal / (costKmL)).toFixed(2) *
              fuelCost +
              costForDay;
          }
        }
        this.travelMessage.emit(`The trip of ${distanceKmVal} km will cost €${(+travelCost).toFixed(2)}, considering the fuel cost (€${fuelCost}), vehicle wear (€${costForDay}), and average fuel consumption (€${consumption})`)
      }
    })
  }

  ngOnInit(): void {
    this.gasolatorForm = this.fb.group({
      [this.fromFormName]: ['', Validators.required],
      [this.toFormName]: ['', [Validators.required, autocompleteValidator()]],
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

  calculateCost() {
    this.fromLatLng = {
      lat: this.gasolatorForm?.get(this.fromFormName)?.value.lat,
      lon: this.gasolatorForm?.get(this.fromFormName)?.value.lon,
    }
    this.toLatLng = {
      lat: this.gasolatorForm?.get(this.toFormName)?.value.lat,
      lon: this.gasolatorForm?.get(this.toFormName)?.value.lon,
    }
    this.exceuteCalculate.emit({ from: this.fromLatLng, to: this.toLatLng })
  }

  ngAfterViewInit(): void {
    this.gasolatorForm?.get(this.fromFormName)?.valueChanges.pipe(tap(() => this.fromAutocompleteSuggest = []), filter(v => v.length > 2), debounceTime(500), switchMap(val => {
      return this.restService.searchAddress(val)
    })).subscribe(val => this.fromAutocompleteSuggest = val)

    this.gasolatorForm?.get(this.toFormName)?.valueChanges.pipe(tap(() => this.toAutocompleteSuggest = []), filter(v => v.length > 2), debounceTime(500), switchMap(val => {
      return this.restService.searchAddress(val)
    })).subscribe(val => this.toAutocompleteSuggest = val)
  }
}
