import { Component, output, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header-ui',
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './header-ui.component.html',
  styleUrl: './header-ui.component.scss'
})
export class HeaderUiComponent implements OnInit, OnDestroy {

  openSidebar = output();

  private translate = inject(TranslateService);
  private sub?: Subscription;
  currentLang = this.translate.currentLang || this.translate.getDefaultLang() || this.translate.getBrowserLang() || 'en';

  ngOnInit(): void {
    // ensure document lang matches current translation
    try { document.documentElement.lang = this.currentLang; } catch {}
    // listen for language changes (e.g., set by AppComponent after geolocation)
    this.sub = this.translate.onLangChange.subscribe((ev: LangChangeEvent) => {
      this.currentLang = ev.lang;
      try { document.documentElement.lang = ev.lang; } catch {}
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get currentFlag() {
    return this.currentLang === 'it' ? '🇮🇹' : '🇬🇧';
  }

  toggleLanguage() {
    const next = this.currentLang === 'it' ? 'en' : 'it';
    this.translate.use(next);
    // translate.onLangChange will update currentLang when change completes
  }

}
