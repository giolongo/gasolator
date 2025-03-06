import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapFeatureComponent } from './map-feature.component';

describe('MapFeatureComponent', () => {
  let component: MapFeatureComponent;
  let fixture: ComponentFixture<MapFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapFeatureComponent]
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
