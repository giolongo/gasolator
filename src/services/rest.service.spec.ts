import { TestBed } from '@angular/core/testing';

import { RestService } from './rest.service';
import { appTestProviders } from '../testing/app-test-providers';

describe('RestService', () => {
  let service: RestService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: appTestProviders,
    });
    service = TestBed.inject(RestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
