import { NominationSuggestModel } from "./nomination-suggest.model";

export interface GasolatorModel {
    from: NominationSuggestModel,
    to: NominationSuggestModel,
    kmL: number,
    lKm: number,
    selectKmType: 'lKm' | 'kmL',
    costForDay: number,
    costFuel: number
}