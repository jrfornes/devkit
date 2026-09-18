import { Component } from '@angular/core';
import { CatalogBanner } from './catalog-banner/catalog-banner';

@Component({
  imports: [CatalogBanner],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected activeCount = 3;
}
