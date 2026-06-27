import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderFeatureComponent } from './header-feature.component';
import { appTestProviders } from '../../testing/app-test-providers';

describe('HeaderFeatureComponent', () => {
  let component: HeaderFeatureComponent;
  let fixture: ComponentFixture<HeaderFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderFeatureComponent],
      providers: appTestProviders,
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
