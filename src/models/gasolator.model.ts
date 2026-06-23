import { NominationSuggestModel } from "./nomination-suggest.model";
import { FuelType, UsageMode } from "./fuel-station.model";

export interface GasolatorModel {
    from: NominationSuggestModel,
    to: NominationSuggestModel,
    kmL: number,
    lKm: number,
    selectKmType: 'lKm' | 'kmL',
    costForDay: number,
    costFuel: number,
    fuelType: FuelType,
    usageMode: UsageMode,
    searchRadius: number,
    roundTrip: boolean
}
