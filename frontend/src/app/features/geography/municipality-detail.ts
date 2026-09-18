import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { GeoApi } from '../../core/api/geo.api';
import { Address, EntityCode, Municipality } from '../../core/api/geo.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { formatNumber } from '../../core/ui/format';
import { Button } from '../../ui/button/button';
import { CopyButton, Property } from '../../ui/data/properties';
import { EmptyState, ErrorState, Skeleton } from '../../ui/feedback/feedback';
import { SearchBox } from '../../ui/form/search-box';
import { Segmented, SegmentOption } from '../../ui/form/segmented';
import { LatLng, formatPosition, toPosition } from '../../shared/map/geo';
import { Icon } from '../../ui/icon/icon';

export type MunicipalityTab = 'streets' | 'postcodes' | 'bodies';

/**
 * Everything a surveyor looks up about one comune: its codes, ready to copy, then its streets on
 * the map, the postal codes it uses and the public bodies registered in it.
 */
@Component({
  selector: 'bm-municipality-detail',
  imports: [RouterLink, Icon, Button, CopyButton, Property, EmptyState, ErrorState, Skeleton, SearchBox, Segmented],
  template: `
    @let m = place();
    <div class="place">
      <div class="place__actions">
        @if (sessions.can('registration:write')) {
          <a bmButton size="sm" variant="primary" [routerLink]="['/survey']" [queryParams]="{ istat: m.istatCode }">
            <svg lucideIcon="map-pin-plus"></svg>
            Register an asset here
          </a>
        }
        @if (sessions.can('registration:read')) {
          <a bmButton size="sm" [routerLink]="['/registry']" [queryParams]="{ istat: m.istatCode }">
            <svg lucideIcon="landmark"></svg>
            Registrations here
          </a>
        }
      </div>

      <dl class="place__codes">
        <bm-property label="ISTAT code" [value]="m.istatCode" mono copyable />
        <bm-property label="Cadastral code" [value]="m.cadastralCode" mono copyable />
        <bm-property label="Main postal code" [value]="m.postalCode" mono copyable />
        <bm-property label="Population" [value]="m.population != null ? formatNumber(m.population) : null" />
        @if (position(); as at) {
          <div class="place__coordinates">
            <bm-property label="Centre" [value]="formatPosition(at, 5)" mono copyable />
          </div>
        }
      </dl>

      <bm-segmented class="place__tabs" size="sm" ariaLabel="Look up in this municipality" [options]="tabs" [value]="tab()" (valueChange)="tab.set($event)" />

      @switch (tab()) {
        @case ('streets') {
          <section class="place__section" animate.enter="bm-enter-rise" aria-label="Streets">
            <bm-search-box [placeholder]="'A street in ' + m.name" [value]="street()" [busy]="streets.isFetching()" (search)="street.set($event)" />
            @if (!street()) {
              <p class="place__hint">Type part of a street name. Each result can be shown on the map and seen in Street View.</p>
            } @else if (streets.isError()) {
              <bm-error-state title="Streets could not be searched" [error]="streets.error()" (retry)="streets.refetch()" />
            } @else if (streets.isPending()) {
              @for (placeholder of [0, 1, 2]; track placeholder) {
                <bm-skeleton height="52px" />
              }
            } @else if (streets.data()?.length) {
              <ul class="place__rows">
                @for (address of streets.data()!; track address.label; let i = $index) {
                  <li [style.--bm-i]="i">
                    <button type="button" class="place__row" [class.is-selected]="selectedStreet() === address.label" (click)="choose(address)">
                      <span class="place__row-icon"><svg lucideIcon="route" [size]="15"></svg></span>
                      <span class="place__row-text">
                        <strong>{{ address.street ?? address.label }}{{ address.houseNumber ? ' ' + address.houseNumber : '' }}</strong>
                        <span>{{ where(address) }}</span>
                      </span>
                      <svg class="place__row-go" lucideIcon="crosshair" [size]="15"></svg>
                    </button>
                    @if (selectedStreet() === address.label && toPosition(address.latitude, address.longitude)) {
                      <button type="button" bmButton size="sm" variant="ghost" class="place__look" animate.enter="bm-enter-pop" (click)="look.emit(toPosition(address.latitude, address.longitude)!)">
                        <svg lucideIcon="scan-search"></svg>
                        Look from the street
                      </button>
                    }
                  </li>
                }
              </ul>
            } @else {
              <bm-empty-state icon="route" title="No street found" description="Try fewer words, or the name without Via or Piazza." compact />
            }
          </section>
        }
        @case ('postcodes') {
          <section class="place__section" animate.enter="bm-enter-rise" aria-label="Postal codes">
            @if (postcodes.isPending()) {
              <bm-skeleton height="40px" />
            } @else if (postcodes.isError()) {
              <bm-error-state title="Postal codes could not be loaded" [error]="postcodes.error()" (retry)="postcodes.refetch()" />
            } @else if (postcodes.data()?.length) {
              <p class="place__hint">Larger comuni use a different code for each area; the street decides which applies.</p>
              <ul class="place__chips">
                @for (code of postcodes.data()!; track code; let i = $index) {
                  <li [style.--bm-i]="i">
                    <span class="bm-mono">{{ code }}</span>
                    <bm-copy-button [value]="code" label="Postal code" />
                  </li>
                }
              </ul>
            } @else {
              <bm-empty-state icon="hash" title="No postal codes on record" compact />
            }
          </section>
        }
        @case ('bodies') {
          <section class="place__section" animate.enter="bm-enter-rise" aria-label="Public bodies">
            <bm-search-box placeholder="A public body, such as Comune or Scuola" [value]="body()" [busy]="bodies.isFetching()" (search)="body.set($event || m.name)" />
            @if (bodies.isError()) {
              <bm-error-state title="Public bodies could not be searched" [error]="bodies.error()" (retry)="bodies.refetch()" />
            } @else if (bodies.isPending()) {
              @for (placeholder of [0, 1]; track placeholder) {
                <bm-skeleton height="96px" />
              }
            } @else if (bodies.data()?.length) {
              <ul class="place__bodies">
                @for (entity of bodies.data()!; track entity.name + entity.billingCode; let i = $index) {
                  <li [style.--bm-i]="i">
                    <div class="place__body-head">
                      <span class="place__row-icon"><svg lucideIcon="building" [size]="15"></svg></span>
                      <span class="place__row-text">
                        <strong>{{ entity.name }}</strong>
                        <span>{{ entity.category || 'Public body' }}{{ entity.offices ? ' · ' + entity.offices + ' offices' : '' }}</span>
                      </span>
                    </div>
                    <dl class="place__body-codes">
                      <div><dt>Billing code</dt><dd class="bm-mono">{{ entity.billingCode || '—' }}@if (entity.billingCode) {<bm-copy-button [value]="entity.billingCode" label="Billing code" />}</dd></div>
                      <div><dt>IPA code</dt><dd class="bm-mono">{{ entity.ipaCode || '—' }}@if (entity.ipaCode) {<bm-copy-button [value]="entity.ipaCode" label="IPA code" />}</dd></div>
                      <div><dt>Tax code</dt><dd class="bm-mono">{{ entity.taxCode || '—' }}@if (entity.taxCode) {<bm-copy-button [value]="entity.taxCode" label="Tax code" />}</dd></div>
                    </dl>
                  </li>
                }
              </ul>
            } @else {
              <bm-empty-state icon="building" title="No public body matches" description="Try the kind of body, such as Comune, Istituto or Azienda." compact />
            }
          </section>
        }
      }
    </div>
  `,
  styleUrl: './municipality-detail.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MunicipalityDetail {
  readonly place = input.required<Municipality>();
  /** A street chosen from the results, for the map to show. */
  readonly street$ = output<Address | null>({ alias: 'streetChosen' });
  readonly look = output<LatLng>();

  private readonly geo = inject(GeoApi);
  protected readonly sessions = inject(SessionStore);

  protected readonly formatNumber = formatNumber;
  protected readonly formatPosition = formatPosition;
  protected readonly toPosition = toPosition;

  protected readonly tabs: SegmentOption<MunicipalityTab>[] = [
    { value: 'streets', label: 'Streets', icon: 'route' },
    { value: 'postcodes', label: 'Postal codes', icon: 'hash' },
    { value: 'bodies', label: 'Public bodies', icon: 'building' },
  ];
  protected readonly tab = signal<MunicipalityTab>('streets');
  protected readonly street = signal('');
  protected readonly body = signal('');
  protected readonly selectedStreet = signal<string | null>(null);

  protected readonly position = computed(() => toPosition(this.place().latitude, this.place().longitude));

  protected readonly streets = injectQuery(() => {
    const place = this.place();
    const query = { street: this.street().trim(), municipality: place.name, province: place.provinceCode, limit: 10 };
    return {
      queryKey: keys.geo.addresses(query),
      queryFn: () => this.geo.addresses(query),
      enabled: this.tab() === 'streets' && query.street.length >= 2,
      staleTime: 10 * 60_000,
    };
  });

  protected readonly postcodes = injectQuery(() => {
    const place = this.place();
    return {
      queryKey: keys.geo.postalCodes(place.name, place.provinceCode),
      queryFn: () => this.geo.postalCodes(place.name, { province: place.provinceCode }, 20),
      enabled: this.tab() === 'postcodes',
      staleTime: Infinity,
    };
  });

  protected readonly bodies = injectQuery(() => {
    const place = this.place();
    const q = this.body().trim() || place.name;
    const filters = { municipality: place.name, province: place.provinceCode };
    return {
      queryKey: keys.geo.entities(q, filters),
      queryFn: (): Promise<EntityCode[]> => this.geo.entityCodes(q, filters, 10),
      enabled: this.tab() === 'bodies',
      staleTime: 10 * 60_000,
    };
  });

  constructor() {
    // A different comune starts clean: no street, no body search, no pin from the previous one.
    effect(() => {
      void this.place().istatCode;
      untracked(() => {
        this.street.set('');
        this.body.set('');
        this.selectedStreet.set(null);
        this.street$.emit(null);
      });
    });
  }

  protected where(address: Address): string {
    return [address.postalCode, address.municipality].filter(Boolean).join(' · ') || address.label;
  }

  protected choose(address: Address): void {
    const same = this.selectedStreet() === address.label;
    this.selectedStreet.set(same ? null : address.label);
    this.street$.emit(same ? null : address);
  }
}
