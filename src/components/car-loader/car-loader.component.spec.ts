import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarLoaderComponent } from './car-loader.component';

describe('CarLoaderComponent', () => {
  let component: CarLoaderComponent;
  let fixture: ComponentFixture<CarLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarLoaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CarLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
