import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderUiComponent } from './header-ui.component';
import { appTestProviders } from '../../testing/app-test-providers';

describe('HeaderUiComponent', () => {
  let component: HeaderUiComponent;
  let fixture: ComponentFixture<HeaderUiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderUiComponent],
      providers: appTestProviders,
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderUiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
