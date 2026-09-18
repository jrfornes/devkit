import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { CatalogBanner } from './catalog-banner/catalog-banner';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, CatalogBanner],
    }).compileComponents();
  });

  it('should render the catalog banner', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="catalog-banner"] h1')?.textContent).toContain(
      'Active Catalog',
    );
  });
});
