import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterUiComponent } from './footer-ui.component';
import { appTestProviders } from '../../testing/app-test-providers';

describe('FooterUiComponent', () => {
  let component: FooterUiComponent;
  let fixture: ComponentFixture<FooterUiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterUiComponent],
      providers: appTestProviders,
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterUiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
