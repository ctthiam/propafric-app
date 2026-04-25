import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaInstallBannerComponent } from './shared/pwa-install-banner/pwa-install-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PwaInstallBannerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'propafric-app';
}
