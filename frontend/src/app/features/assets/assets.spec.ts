import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ASSETS } from '../../core/demo/demo-assets';
import { ToastService } from '../../shared/toast.service';
import { Assets } from './assets';
import { AssetsService } from './assets.service';
import { Municipality } from './asset.models';

vi.mock('leaflet', () => {
  const marker = { remove: vi.fn(), setLatLng: vi.fn().mockReturnThis(), addTo: vi.fn().mockReturnThis() };
  const map = { setView: vi.fn().mockReturnThis(), on: vi.fn(), remove: vi.fn(), flyTo: vi.fn(), addLayer: vi.fn(), getCenter: () => ({ lat: 44, lng: 8 }) };
  return { map: () => map, circleMarker: () => marker, tileLayer: () => ({ remove: vi.fn() }), control: { scale: () => ({ addTo: vi.fn() }) }, latLng: (lat: number, lng: number) => ({ lat, lng }) };
});

const PLACE: Municipality = { nome: 'Cremolino', codice: '006061', coordinate: { lat: 44, lng: 8 }, provincia: { nome: 'Alessandria', sigla: 'AL', regione: 'Piemonte' } };

describe('Asset selection and exports', () => {
  let fixture: ComponentFixture<Assets>;
  let host: HTMLElement;
  const service = { regions: vi.fn(), provinces: vi.fn(), municipalities: vi.fn(), findAll: vi.fn(), findMunicipality: vi.fn(), geocode: vi.fn(), exportForms: vi.fn() };

  beforeEach(async () => {
    for (const method of Object.values(service)) method.mockReset();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    service.regions.mockReturnValue(of(['Piemonte']));
    service.provinces.mockReturnValue(of(['Alessandria']));
    service.municipalities.mockReturnValue(of([PLACE]));
    service.findAll.mockReturnValue(of(ASSETS));
    service.findMunicipality.mockReturnValue(of(PLACE));
    service.geocode.mockReturnValue(of({ lat: 45, lng: 9 }));
    await TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: AssetsService, useValue: service },
      { provide: AuthService, useValue: { isAdmin: () => true } },
      { provide: ToastService, useValue: { show: vi.fn() } },
    ] }).compileComponents();
    fixture = TestBed.createComponent(Assets);
    host = fixture.nativeElement as HTMLElement;
    await settle();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  async function settle() { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); }
  function field(label: string) {
    const input = host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
    if (!input) throw new Error(`Missing field: ${label}`);
    return input;
  }

  it('ignores an old asset lookup that finishes after a newer selection', async () => {
    const first = new Subject<Municipality>();
    const second = new Subject<Municipality>();
    service.findMunicipality.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const buttons = host.querySelectorAll<HTMLButtonElement>('tbody button');
    buttons.item(0).click();
    buttons.item(1).click();
    second.next(PLACE); second.complete();
    await settle();
    const selectedName = field('Asset name').value;
    first.next({ ...PLACE, nome: 'Old city' }); first.complete();
    await settle();
    expect(field('Asset name').value).toBe(selectedName);
    expect(field('Municipality').value).toBe('Cremolino');
  });

  it('does not let a late geocoder overwrite a manually chosen location', async () => {
    const geocode = new Subject<{ lat: number; lng: number }>();
    service.geocode.mockReturnValue(geocode);
    host.querySelector<HTMLButtonElement>('tbody button')?.click();
    await settle();
    const centre = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.trim() === 'Use map centre');
    centre?.click();
    await settle();
    geocode.next({ lat: 50, lng: 12 }); geocode.complete();
    await settle();
    expect(field('Latitude').value).toBe('44');
    expect(field('Longitude').value).toBe('8');
  });

  it('clears old coordinates when the next address cannot be located', async () => {
    host.querySelector<HTMLButtonElement>('tbody button')?.click();
    await settle();
    await vi.waitFor(() => { fixture.detectChanges(); expect(field('Latitude').value).toBe('45'); });
    service.geocode.mockReturnValue(of(undefined));
    field('Address').dispatchEvent(new Event('blur'));
    await settle();
    expect(field('Latitude').value).toBe('');
    await vi.waitFor(() => { fixture.detectChanges(); expect(host.textContent).toContain('Address not found.'); });
  });

  it('reports a failed CSV download and restores the button', async () => {
    service.exportForms.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    const download = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.trim() === 'Download CSV');
    download?.click();
    await settle();
    expect(host.textContent).toContain('Could not download the CSV.');
    expect(download?.disabled).toBe(false);
  });
});
