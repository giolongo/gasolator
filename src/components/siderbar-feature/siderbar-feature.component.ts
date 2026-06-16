import { AfterViewInit, Component, effect, inject, input, OnInit, output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { debounceTime, filter, switchMap, tap } from 'rxjs';
import { CoordinateModel } from '../../models/coordinate.model';
import { DistanceModel, RouteMetrics, RouteSummary } from '../../models';
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
  private translate = inject(TranslateService);
  // toll estimates removed

  protected exceuteCalculate = output<{coordinate: DistanceModel, isRoundTrip: boolean}>();
  protected routeSummaryChange = output<RouteSummary>();
  public routeMetrics = input<RouteMetrics>({ distanceKm: 0, durationMinutes: 0, routeWarnings: [] });

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
      const metrics = this.routeMetrics();
      if (metrics.distanceKm > 0) {
        this.routeSummaryChange.emit(this.calculateRouteSummary(metrics));
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

    this.tryFillFromCurrentLocation();

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

  private tryFillFromCurrentLocation(): void {
    const fromControl = this.gasolatorForm?.get(`${this.itineraryFormName}.${this.fromFormName}`);
    if (!fromControl || fromControl.value) {
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // reverse geocode to get a human readable address
          this.restService.reverseGeocode(position.coords.latitude, position.coords.longitude).subscribe(res => {
            if (res) {
              fromControl.setValue({
                display_name: res.display_name,
                lat: Number(res.lat),
                lon: Number(res.lon),
              });
            } else {
              fromControl.setValue({
                display_name: this.translate.instant('MAP.CURRENT_LOCATION'),
                lat: position.coords.latitude,
                lon: position.coords.longitude,
              });
            }
          });
        },
        () => {
          // Se l'utente non consente o la geolocalizzazione non è disponibile, non facciamo nulla.
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    }
  }

  public recalcFromCurrentLocation(): void {
    const fromControl = this.gasolatorForm?.get(`${this.itineraryFormName}.${this.fromFormName}`);
    if (!fromControl) return;
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.restService.reverseGeocode(position.coords.latitude, position.coords.longitude).subscribe(res => {
          if (res) {
            fromControl.setValue({
              display_name: res.display_name,
              lat: Number(res.lat),
              lon: Number(res.lon),
            });
          } else {
            fromControl.setValue({
              display_name: this.translate.instant('MAP.CURRENT_LOCATION'),
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            });
          }
        })
      }, () => {
        // ignore error
      }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
    }
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
    this.exceuteCalculate.emit({ coordinate: {from: this.fromLatLng, to: this.toLatLng, intermediateStops}, isRoundTrip: this.gasolatorForm?.get(this.roundTripControlName)?.value })
  }

  private calculateRouteSummary(metrics: RouteMetrics): RouteSummary {
    let fuelOnlyCost = 0;
    let consumption = '0 km/l';
    const kmType = this.gasolatorForm?.get(this.selectKmTypeName)?.value;
    const costLKm = +this.gasolatorForm?.get(this.costLKmFormControlName)?.value;
    const costKmL = +this.gasolatorForm?.get(this.costKmLFormControlName)?.value;
    const fuelPrice = +this.gasolatorForm?.get(this.fuelCostControlName)?.value;
    const vehicleWearCost = +this.gasolatorForm?.get(this.costForDayControlName)?.value || 0;
    // tolls removed; set tollCost to 0 implicitly

    if (kmType === 'lKm') {
      consumption = `${costLKm} l/100km`;
      fuelOnlyCost = (metrics.distanceKm / 100) * costLKm * fuelPrice;
    } else {
      consumption = `${costKmL} km/l`;
      fuelOnlyCost = costKmL > 0 ? (metrics.distanceKm / costKmL) * fuelPrice : 0;
    }

    if (Number.isNaN(fuelOnlyCost)) {
      fuelOnlyCost = 0;
    }

    const totalCost = fuelOnlyCost + vehicleWearCost;

    return {
      ...metrics,
      fuelCost: fuelOnlyCost,
      vehicleWearCost,
      totalCost,
      consumption
    };
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

  deleteElement(index: number) {
    this.intermediateStops?.removeAt(index);
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
