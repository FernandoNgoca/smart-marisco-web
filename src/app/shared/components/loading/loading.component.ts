import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '@app/services/loading.service';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-overlay" *ngIf="loading$ | async">
      <div class="loading-content" role="status" aria-live="polite" aria-atomic="true">
        <div class="loading-mark" aria-hidden="true">
          <span class="loading-ring"></span>
          <img src="assets/log.png" width="56" height="56" alt="">
        </div>
        <p class="loading-title">A carregar…</p>
        <p class="loading-text">Aguarde um instante.</p>
      </div>
    </div>
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(24, 51, 76, .18);
      z-index: 9999;
    }

    .loading-content {
      box-sizing: border-box;
      width: 224px;
      max-width: 100%;
      padding: 28px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      border: 1px solid var(--app-border);
      border-radius: 20px;
      background: var(--app-surface);
      box-shadow: 0 16px 48px rgba(24, 51, 76, .16);
    }

    .loading-mark {
      position: relative;
      display: grid;
      place-items: center;
      width: 76px;
      height: 76px;
      margin-bottom: 20px;
    }

    .loading-mark img {
      display: block;
      width: 56px;
      height: 56px;
      object-fit: contain;
    }

    .loading-ring {
      position: absolute;
      inset: 0;
      box-sizing: border-box;
      border: 3px solid var(--app-primary-soft);
      border-top-color: var(--app-primary);
      border-right-color: var(--app-primary);
      border-radius: 50%;
      animation: loading-turn 1s linear infinite;
    }

    .loading-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--app-text);
    }

    .loading-text {
      margin: 6px 0 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--app-muted);
      text-align: center;
    }

    @keyframes loading-turn { to { transform: rotate(360deg); } }

    @media (prefers-reduced-motion: reduce) {
      .loading-ring { animation: none; }
    }
  `]
})
export class LoadingComponent {
  loading$ = this.loadingService.loading$;
  constructor(private loadingService: LoadingService) {}
}
