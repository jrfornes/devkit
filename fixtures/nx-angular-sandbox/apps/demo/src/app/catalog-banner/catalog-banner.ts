import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-catalog-banner',
  templateUrl: './catalog-banner.html',
  styleUrl: './catalog-banner.css',
})
export class CatalogBanner {
  readonly activeCount = input(3);
  readonly displayedCount = signal(this.activeCount());

  refreshCount(): void {
    this.displayedCount.update((count) => count + 1);
  }
}
