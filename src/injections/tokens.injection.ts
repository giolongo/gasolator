import { InjectionToken } from '@angular/core';
import { EnvironmentModel } from '../models/envirnoment.model';

export const APP_CONFIG = new InjectionToken<EnvironmentModel>(
  'Application config'
);