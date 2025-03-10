import { CoordinateModel } from "./coordinate.model";

export interface DistanceModel {
    from: CoordinateModel,
    intermediateStops: CoordinateModel[],
    to: CoordinateModel
}