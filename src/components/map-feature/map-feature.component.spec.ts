import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapFeatureComponent } from './map-feature.component';
import { appTestProviders } from '../../testing/app-test-providers';

describe('MapFeatureComponent', () => {
  let component: MapFeatureComponent;
  let fixture: ComponentFixture<MapFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapFeatureComponent],
      providers: appTestProviders,
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
