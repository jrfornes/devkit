import { Component, input } from '@angular/core';

@Component({
  selector: 'app-catalog-banner',
  templateUrl: './catalog-banner.html',
  styleUrl: './catalog-banner.css',
})
export class CatalogBanner {
  readonly activeCount = input(3);
}
