import { Component, OnInit, OnDestroy, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgIf } from '@angular/common';

const DISMISSED_KEY = 'pwa_banner_dismissed';

@Component({
  selector: 'app-pwa-install-banner',
  standalone: true,
  imports: [NgIf],
  templateUrl: './pwa-install-banner.component.html',
  styleUrl: './pwa-install-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PwaInstallBannerComponent implements OnInit, OnDestroy {
  readonly show   = signal(false);
  readonly isIos  = signal(false);

  private deferredPrompt: any = null;
  private promptHandler = (e: Event) => {
    e.preventDefault();
    this.deferredPrompt = e;
    if (!this.wasDismissed()) this.show.set(true);
  };

  ngOnInit(): void {
    if (this.wasDismissed()) return;
    if (this.isStandalone())  return;

    if (this.detectIos()) {
      this.isIos.set(true);
      this.show.set(true);
      return;
    }

    window.addEventListener('beforeinstallprompt', this.promptHandler as EventListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeinstallprompt', this.promptHandler as EventListener);
  }

  async install(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    if (outcome === 'accepted') this.dismiss();
    else this.show.set(false);
  }

  dismiss(): void {
    localStorage.setItem(DISMISSED_KEY, '1');
    this.show.set(false);
  }

  private detectIos(): boolean {
    const ua = navigator.userAgent;
    return /iphone|ipad|ipod/i.test(ua) && /webkit/i.test(ua) && !/crios|fxios/i.test(ua);
  }

  private isStandalone(): boolean {
    return (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
  }

  private wasDismissed(): boolean {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  }
}
