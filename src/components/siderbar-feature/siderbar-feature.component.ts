import { AfterViewInit, Component, effect, inject, input, OnInit, output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { debounceTime, filter, switchMap, tap } from 'rxjs';
import { CoordinateModel } from '../../models/coordinate.model';
import { DistanceModel } from '../../models/distance.model';
import { NominationSuggestModel } from '../../models/nomination-suggest.model';
import { RestService } from '../../services/rest.service';
import { autocompleteValidator } from '../../validators/autocomplete.validator';
import { SiderbarUiComponent } from "../siderbar-ui/siderbar-ui.component";

@Component({
  selector: 'app-siderbar-feature',
  imports: [SiderbarUiComponent],
  templateUrl: './siderbar-feature.component.html',
  styleUrl: './siderbar-feature.component.scss'
})
export class SiderbarFeatureComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private restService = inject(RestService);

  protected exceuteCalculate = output<DistanceModel>();
  protected travelMessage = output<string>();
  public distanceKm = input<number>();

  public mapFormControlNameNominationSuggest: {[key: string | number]: NominationSuggestModel[]} = {};

  // public fromAutocompleteSuggest: NominationSuggestModel[] = [];
  // public toAutocompleteSuggest: NominationSuggestModel[] = [];

  public travelCost?: number;
  public itineraryFormName = 'itinerary';
  public fromFormName = 'from';
  public toFormName = 'to';
  public intermediateStopsFormName = 'intermediateStops';
  public costKmLFormControlName = 'kmL';
  public costLKmFormControlName = 'lKm';
  public selectKmTypeName = 'selectKmType';
  public costForDayControlName = 'costForDay';
  public fuelCostControlName = 'costFuel';
  public roundTripControlName = 'roundTrip';
  public gasolatorForm?: FormGroup;
  public costKmFormControlName = this.costKmLFormControlName;
  public fromLatLng?: CoordinateModel;
  public toLatLng?: CoordinateModel;

  constructor() {
    effect(() => {
      const distanceKmVal = this.distanceKm();
      if (distanceKmVal && distanceKmVal > 0) {
        let travelCost = 0;
        let consumption;
        const isRoundTrip = this.gasolatorForm?.get(this.roundTripControlName)?.value;
        const kmType = this.gasolatorForm?.get(this.selectKmTypeName)?.value;
        const costLKm = +this.gasolatorForm?.get(this.costLKmFormControlName)?.value;
        const costKmL = +this.gasolatorForm?.get(this.costKmLFormControlName)?.value;
        const fuelCost = +(this.gasolatorForm?.get(this.fuelCostControlName)?.value);
        const costForDay = +(this.gasolatorForm?.get(this.costForDayControlName)?.value);

        if (kmType === 'lKm') {
          consumption = costLKm + 'l/100km';
          travelCost =
            +((isRoundTrip ? distanceKmVal * 2 : distanceKmVal) / 100).toFixed(2) *
            costLKm *
            fuelCost +
            costForDay;
        } else {
          consumption = costKmL + 'km/l';
          travelCost =
            +((isRoundTrip ? distanceKmVal * 2 : distanceKmVal) / (costKmL)).toFixed(2) *
            fuelCost +
            costForDay;
        }
        if (Number.isNaN(travelCost)) {
          travelCost = 0;
        }

        if (isRoundTrip) {
          this.travelMessage.emit(`The trip is ${distanceKmVal * 2} km (${distanceKmVal} km for journey ) will cost €${(+travelCost).toFixed(2)}, considering the fuel cost (€${fuelCost}), vehicle wear (€${costForDay}), and average fuel consumption (${consumption}). The price does not include extra transport costs.`)
        } else {
          this.travelMessage.emit(`The trip of ${distanceKmVal} km will cost €${(+travelCost).toFixed(2)}, considering the fuel cost (€${fuelCost}), vehicle wear (€${costForDay}), and average fuel consumption (${consumption}). The price does not include extra transport costs.`)
        }

      }
    })
  }

  ngOnInit(): void {
    this.gasolatorForm = this.fb.group({
      [this.itineraryFormName]: this.fb.group({
        [this.fromFormName]: ['', [Validators.required, autocompleteValidator()]], // Campo FROM fisso
        [this.intermediateStopsFormName]: this.fb.array([]), // Array per tappe intermedie
        [this.toFormName]: ['', [Validators.required, autocompleteValidator()]] // Campo TO fisso
      }),
      [this.costForDayControlName]: ['0', Validators.required],
      [this.selectKmTypeName]: ['kmL', Validators.required],
      [this.fuelCostControlName]: ['0', Validators.required],
      [this.costKmLFormControlName]: ['0', Validators.required],
      [this.roundTripControlName]: [true, Validators.required],
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
    const intermediateStops:CoordinateModel[] = []
    this.fromLatLng = {
      lat: this.itineraryForm?.get(this.fromFormName)?.value.lat,
      lon: this.itineraryForm?.get(this.fromFormName)?.value.lon,
      name: this.itineraryForm?.get(this.fromFormName)?.value.display_name
    }
    this.toLatLng = {
      lat: this.itineraryForm?.get(this.toFormName)?.value.lat,
      lon: this.itineraryForm?.get(this.toFormName)?.value.lon,
      name: this.itineraryForm?.get(this.toFormName)?.value.display_name
    }
    this.intermediateStops?.controls.forEach(c => {
      intermediateStops.push({
        lat: c.value.lat,
        lon: c.value.lon,
        name: c.value.display_name
      })
    })
    this.exceuteCalculate.emit({ from: this.fromLatLng, to: this.toLatLng, intermediateStops })
  }

  get intermediateStops(): FormArray {
    const intermadiateFormArray = this.gasolatorForm?.get(`${this.itineraryFormName}.${this.intermediateStopsFormName}`);
    if (intermadiateFormArray instanceof FormArray) {
      return intermadiateFormArray;
    }
    throw Error("No Form Array");
  }

  get itineraryForm(): FormGroup {
    const itineraryFormSignal = this.gasolatorForm?.get(`${this.itineraryFormName}`);
    if (itineraryFormSignal instanceof FormGroup) {
      return itineraryFormSignal;
    }
    throw Error("No Form Group");
  }

  addStop() {
    this.intermediateStops?.push(this.fb.control('', [Validators.required, autocompleteValidator()]));
  }

  handleIntermediateStopsChanges(): void {
    this.intermediateStops.controls.forEach((control, index) => {
      if (!control.valueChanges) return; // Evita errori se il controllo non ha valueChanges
      
      control.valueChanges.pipe(
        tap(() => this.mapFormControlNameNominationSuggest[index] = []),
        filter(v => v.length > 2),
        debounceTime(500),
        switchMap(val => this.restService.searchAddress(val))
      ).subscribe(val => this.mapFormControlNameNominationSuggest[index] = val);
    });
  }

  ngAfterViewInit(): void {
    this.gasolatorForm?.get(this.itineraryFormName)?.get(this.fromFormName)?.valueChanges.pipe(tap(() => this.mapFormControlNameNominationSuggest[this.fromFormName] = []), filter(v => v.length > 2), debounceTime(500), switchMap(val => {
      return this.restService.searchAddress(val)
    })).subscribe(val => this.mapFormControlNameNominationSuggest[this.fromFormName] = val)

    this.gasolatorForm?.get(this.itineraryFormName)?.get(this.toFormName)?.valueChanges.pipe(tap(() => this.mapFormControlNameNominationSuggest[this.toFormName]  = []), filter(v => v.length > 2), debounceTime(500), switchMap(val => {
      return this.restService.searchAddress(val)
    })).subscribe(val => this.mapFormControlNameNominationSuggest[this.toFormName] = val = val)

    this.intermediateStops.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      this.handleIntermediateStopsChanges();
    });
  }
}
