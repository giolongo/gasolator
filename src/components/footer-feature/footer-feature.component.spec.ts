import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterFeatureComponent } from './footer-feature.component';
import { appTestProviders } from '../../testing/app-test-providers';

describe('FooterFeatureComponent', () => {
  let component: FooterFeatureComponent;
  let fixture: ComponentFixture<FooterFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterFeatureComponent],
      providers: appTestProviders,
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
