import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterUiComponent } from './footer-ui.component';

describe('FooterUiComponent', () => {
  let component: FooterUiComponent;
  let fixture: ComponentFixture<FooterUiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterUiComponent]
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
