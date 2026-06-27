import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { appTestProviders } from '../testing/app-test-providers';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: appTestProviders,
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'gasolator' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('gasolator');
  });

  it('should render the app shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header-feature')).toBeTruthy();
    expect(compiled.querySelector('app-map-feature')).toBeTruthy();
  });
});
