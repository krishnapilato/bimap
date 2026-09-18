import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FieldTree, FormField, TreeValidationResult, form, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { QueryClient, injectQuery } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { GeoApi } from '../../core/api/geo.api';
import { Municipality, Province, Region } from '../../core/api/geo.models';
import { RegistrationsApi } from '../../core/api/registrations.api';
import { FormField as SchemaField, Registration, isEditableByAuthor } from '../../core/api/registry.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { copyToClipboard } from '../../core/ui/files';
import { relativeClause } from '../../core/ui/format';
import { Haptics } from '../../core/ui/haptics';
import { PreferencesStore } from '../../core/ui/preferences';
import { bindShortcuts } from '../../core/ui/shortcuts';
import { Viewport } from '../../core/ui/viewport';
import { GeoCanvas } from '../../shared/map/geo-canvas';
import { Insets, LatLng, MapPoint, ZOOM, formatPosition, parsePosition, regionView, toPosition } from '../../shared/map/geo';
import { Button } from '../../ui/button/button';
import { ErrorState, MessageStrip, Skeleton } from '../../ui/feedback/feedback';
import { Field, Input } from '../../ui/form/field';
import { Lookup, LookupOption, LookupSearch } from '../../ui/form/lookup';
import { Icon } from '../../ui/icon/icon';
import { Ripple } from '../../ui/interaction/ripple';
import { Confirm } from '../../ui/overlay/confirm-dialog';
import { Sheet, SheetSnap } from '../../ui/overlay/sheet';
import { StatusBadge } from '../../ui/status/status-badge';
import { REGISTRATION_STATUS } from '../../ui/status/status-tones';
import { Tooltip } from '../../ui/tooltip/tooltip';
import { CascadeStep, DEPENDANTS, cascadeSteps, isAnswered, sameText } from './cascade';
import { LocalDraft, SurveyDrafts } from './survey-drafts';
import {
  EMPTY_SURVEY,
  SurveyKey,
  SurveyModel,
  fieldsOf,
  fromRegistration,
  isBlank,
  roundCoordinate,
  sameModel,
  surveyRules,
  toRequest,
} from './survey-form';

type Span = 'full' | 'half' | 'wide' | 'narrow';

/** How the fields sit two to a row. Anything not listed takes the full width. */
const SPANS: Partial<Record<string, Span>> = {
  provinceName: 'wide',
  provinceCode: 'narrow',
  address: 'wide',
  houseNumber: 'narrow',
  postalCode: 'half',
  locality: 'half',
  istatCode: 'half',
  cadastralCode: 'half',
  entityBillingCode: 'half',
  assetReference: 'half',
  ownership: 'half',
  constraintType: 'half',
  cadastralReference: 'half',
  transcription: 'half',
};

/** Codes the form fills in by itself, set in monospace because they are data. */
const CODES = new Set(['provinceCode', 'istatCode', 'cadastralCode', 'entityBillingCode', 'postalCode', 'houseNumber']);

const NEARBY = { page: 0, size: 100 } as const;

/**
 * The survey workspace: the map and Street View edge to edge, with the record floating over them.
 *
 * The form walks the server's cascade — region, province, municipality, street, postcode, asset,
 * ISTAT code, responsible body — and the map follows each answer: choosing a region flies there,
 * choosing a street drops the pin and turns Street View to face it. Placing the pin by hand works
 * the other way round. Work in progress is kept on the device until the server has it.
 */
@Component({
  selector: 'bm-survey',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    FormField,
    Icon,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    GeoCanvas,
    Field,
    Input,
    Lookup,
    Button,
    StatusBadge,
    MessageStrip,
    ErrorState,
    Skeleton,
    Sheet,
    Tooltip,
    Ripple,
  ],
  templateUrl: './survey.html',
  styleUrl: './survey.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bm-survey bm-bleed',
    '[class.is-handset]': 'viewport.isHandset()',
    '[class.is-panel-hidden]': '!panelOpen()',
  },
})
export class Survey {
  /** The registration being edited, from the address; absent for a new one. */
  readonly id = input<string>();
  /** `?istat=` from the geography explorer starts a new registration already in that municipality. */
  readonly istat = input<string>();

  private readonly registrations = inject(RegistrationsApi);
  private readonly geo = inject(GeoApi);
  private readonly queries = inject(QueryClient);
  private readonly drafts = inject(SurveyDrafts);
  private readonly confirm = inject(Confirm);
  private readonly router = inject(Router);
  private readonly haptics = inject(Haptics);
  private readonly preferences = inject(PreferencesStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly sessions = inject(SessionStore);
  protected readonly viewport = inject(Viewport);

  protected readonly canvas = viewChild.required(GeoCanvas);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly status = REGISTRATION_STATUS;
  protected readonly mod = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl ';
  protected readonly relativeClause = relativeClause;
  protected readonly formatPosition = formatPosition;

  // ── Schema and record ──────────────────────────────────────────────────────

  protected readonly schemaQuery = injectQuery(() => ({
    queryKey: keys.registrations.formSchema,
    queryFn: () => this.registrations.formSchema(),
    staleTime: Infinity,
  }));

  protected readonly schema = computed(() => this.schemaQuery.data());
  private readonly fields = computed(() => fieldsOf(this.schema()));

  protected readonly recordQuery = injectQuery(() => ({
    queryKey: keys.registrations.detail(this.id() ?? 'new'),
    queryFn: () => this.registrations.findOne(this.id()!),
    enabled: !!this.id(),
  }));

  protected readonly registration = signal<Registration | null>(null);
  protected readonly model = signal<SurveyModel>({ ...EMPTY_SURVEY });
  private readonly baseline = signal<SurveyModel>({ ...EMPTY_SURVEY });
  protected readonly form = form(this.model, surveyRules(this.fields, () => this.readOnly() || !!this.submitted()));

  private readonly steps = cascadeSteps(this.geo);
  protected readonly searches = new Map<SurveyKey, LookupSearch<unknown>>(
    [...this.steps].map(([field, step]) => [field, (text: string) => step.search(text, this.model())]),
  );

  /** The answers each lookup last settled on, so an edit can tell whether the place really changed. */
  private committed: Partial<Record<SurveyKey, string>> = {};
  private loadedId: string | null | undefined = undefined;

  // ── Derived state ──────────────────────────────────────────────────────────

  protected readonly position = computed(() => toPosition(this.model().latitude, this.model().longitude));
  protected readonly hasChanges = computed(() => !sameModel(this.model(), this.baseline()));

  protected readonly readOnly = computed(() => {
    const saved = this.registration();
    return !!saved && !isEditableByAuthor(saved.status) && !this.sessions.can('registration:read-all');
  });

  protected readonly cascade = computed(() => {
    const model = this.model();
    const fields = this.fields();
    return (this.schema()?.cascade ?? []).map((name) => ({
      name,
      label: fields.get(name)?.label ?? name,
      done: isAnswered(name, model),
    }));
  });

  protected readonly answered = computed(() => this.cascade().filter((step) => step.done).length);
  protected readonly next = computed(() => this.cascade().find((step) => !step.done) ?? null);

  // ── Map ────────────────────────────────────────────────────────────────────

  protected readonly mode = linkedSignal(() => this.preferences.mapMode());
  protected readonly basemap = linkedSignal(() => this.preferences.basemap());
  protected readonly coverage = signal(true);

  protected readonly nearbyQuery = injectQuery(() => {
    const istatCode = this.model().istatCode;
    return {
      queryKey: keys.registrations.list({ istatCode }, NEARBY),
      queryFn: () => this.registrations.search({ istatCode }, NEARBY),
      enabled: /^\d{6}$/.test(istatCode) && this.sessions.can('registration:read'),
      staleTime: 60_000,
    };
  });

  private readonly nearby = computed(() =>
    (this.nearbyQuery.data()?.content ?? []).filter((registration) => registration.id !== this.registration()?.id),
  );

  protected readonly points = computed<MapPoint[]>(() =>
    this.nearby().flatMap((registration) => {
      const position = toPosition(registration.latitude, registration.longitude);
      if (!position) return [];
      const presentation = REGISTRATION_STATUS[registration.status];
      return [{ id: registration.id, position, label: registration.assetName, detail: `${presentation.label} · ${registration.fullAddress}`, tone: presentation.tone }];
    }),
  );

  /** Someone already recorded an asset with this name at this address. */
  protected readonly duplicate = computed(() => {
    const model = this.model();
    if (!model.assetName.trim() || !model.address.trim()) return null;
    return this.nearby().find((registration) => sameText(registration.assetName, model.assetName) && sameText(registration.address, model.address)) ?? null;
  });

  protected readonly selectedPoint = signal<MapPoint | null>(null);

  // ── Layout ─────────────────────────────────────────────────────────────────

  protected readonly panelOpen = signal(true);
  private readonly panelWidth = signal(400);
  protected readonly sheetSnap = signal<SheetSnap>('peek');
  private readonly sheetHeight = signal(0);
  protected readonly optionalOpen = signal(false);

  protected readonly insets = computed<Insets>(() =>
    this.viewport.isHandset()
      ? { top: 0, right: 0, bottom: this.sheetHeight(), left: 0 }
      : { top: 0, right: 0, bottom: 0, left: this.panelOpen() ? this.panelWidth() + 24 : 0 },
  );

  // ── Saving ─────────────────────────────────────────────────────────────────

  protected readonly saving = signal<'draft' | 'submit' | null>(null);
  protected readonly submitted = signal<Registration | null>(null);
  protected readonly restorable = signal<LocalDraft | null>(null);
  protected readonly keptLocallyAt = signal<string | null>(null);
  protected readonly flashed = signal<ReadonlySet<string>>(new Set());
  protected readonly locatingAddress = signal(false);
  protected readonly announcement = signal('');
  private flashTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly savedText = computed(() => {
    if (this.saving()) return 'Saving…';
    if (this.hasChanges() && this.keptLocallyAt()) return 'Kept on this device';
    if (this.hasChanges()) return 'Unsaved changes';
    const saved = this.registration();
    return saved ? `Saved ${relativeClause(saved.updatedAt)}` : 'Nothing entered yet';
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Opening a registration, or coming back to a blank form.
    effect(() => {
      const id = this.id() ?? null;
      const record = this.recordQuery.data();
      untracked(() => {
        if (id && record?.id === id && this.loadedId !== id) this.load(record);
        if (!id && this.loadedId !== null) this.startBlank();
      });
    });

    effect(() => {
      const istat = this.istat();
      if (istat && !this.id()) untracked(() => void this.startIn(istat));
    });

    // Work in progress, kept on the device a moment after each change.
    effect((onCleanup) => {
      const model = this.model();
      const dirty = !sameModel(model, this.baseline());
      if (!dirty || this.restorable() || this.submitted()) return;
      const id = this.registration()?.id ?? null;
      const timer = setTimeout(() => {
        const at = this.drafts.write(id, model);
        if (at) this.keptLocallyAt.set(at);
      }, 700);
      onCleanup(() => clearTimeout(timer));
    });

    effect(() => this.preferences.set('mapMode', this.mode()));
    effect(() => this.preferences.set('basemap', this.basemap()));

    effect((onCleanup) => {
      const panel = this.panel()?.nativeElement;
      if (!panel) return;
      const observer = new ResizeObserver(() => this.panelWidth.set(panel.offsetWidth));
      observer.observe(panel);
      onCleanup(() => observer.disconnect());
    });

    const unsubscribe = bindShortcuts({
      '$mod+KeyS': (event) => {
        event.preventDefault();
        void this.save('draft');
      },
      '$mod+Enter': (event) => {
        event.preventDefault();
        void this.save('submit');
      },
      BracketLeft: (event) => {
        if (isTyping(event)) return;
        event.preventDefault();
        this.togglePanel();
      },
    });

    destroyRef.onDestroy(() => {
      unsubscribe();
      clearTimeout(this.flashTimer);
    });
  }

  // ── Template helpers ───────────────────────────────────────────────────────

  protected text(name: string): FieldTree<string> {
    return (this.form as unknown as Record<string, FieldTree<string>>)[name];
  }

  protected kindOf(field: SchemaField): 'lookup' | 'text' | 'textarea' | 'position' | 'skip' {
    if (field.name === 'latitude') return 'position';
    if (field.name === 'longitude' || !(field.name in EMPTY_SURVEY)) return 'skip';
    if (field.type === 'TEXTAREA') return 'textarea';
    if (field.type === 'AUTOCOMPLETE' && this.steps.has(field.name as SurveyKey)) return 'lookup';
    return 'text';
  }

  protected step(name: string): CascadeStep {
    return this.steps.get(name as SurveyKey)!;
  }

  protected spanOf(name: string): Span {
    return SPANS[name] ?? 'full';
  }

  protected isCode(name: string): boolean {
    return CODES.has(name);
  }

  protected isOptionalSection(id: string): boolean {
    return id === 'protection';
  }

  protected sectionHasValues(fields: readonly SchemaField[]): boolean {
    const model = this.model();
    return fields.some((field) => field.name in model && String(model[field.name as SurveyKey] ?? '').trim());
  }

  // ── Cascade ────────────────────────────────────────────────────────────────

  protected onPicked(name: string, option: LookupOption<unknown>): void {
    const field = name as SurveyKey;
    const step = this.steps.get(field);
    if (!step) return;

    const before = this.model();
    const patch = step.pick(option.value, before);
    const previous = this.committed[field] ?? '';
    const placeChanged = !!previous.trim() && !sameText(previous, String(patch[field] ?? ''));

    const next = { ...(placeChanged ? this.cleared(before, field) : before), ...patch } as SurveyModel;
    this.model.set(next);
    for (const key of ['region', 'provinceName', 'municipality', 'address', 'postalCode', 'entityName'] as const) {
      if (key in patch) this.committed[key] = String(next[key] ?? '');
    }

    this.flash((Object.keys(patch) as SurveyKey[]).filter((key) => key !== field && before[key] !== next[key]));
    if (placeChanged) this.offerUndo(before, field);
    this.follow(field, option.value, next);
  }

  protected onEdited(name: string, text: string): void {
    const field = name as SurveyKey;
    const step = this.steps.get(field);
    if (!step?.derived.length || sameText(text, this.committed[field])) return;
    const model = this.model();
    if (!step.derived.some((key) => model[key] !== '' && model[key] !== null)) return;
    this.model.update((current) => ({ ...current, ...Object.fromEntries(step.derived.map((key) => [key, ''])) }));
  }

  protected onCommitted(name: string, text: string): void {
    const field = name as SurveyKey;
    const previous = this.committed[field] ?? '';
    if (sameText(text, previous)) return;
    this.committed[field] = text;
    if (!previous.trim() || !DEPENDANTS[field]) return;

    const before = this.model();
    this.model.set({ ...this.cleared(before, field), [field]: text });
    this.offerUndo(before, field);
  }

  /** The map follows the cascade, but never away from a pin that is already placed. */
  private follow(field: SurveyKey, value: unknown, model: SurveyModel): void {
    const canvas = this.canvas();
    const placed = toPosition(model.latitude, model.longitude);

    switch (field) {
      case 'region': {
        const view = regionView((value as Region).name);
        if (view && !placed) canvas.flyTo(view.center, view.zoom);
        break;
      }
      case 'provinceName':
        if (!placed) void this.flyToProvince(value as Province);
        break;
      case 'municipality': {
        const at = toPosition((value as Municipality).latitude, (value as Municipality).longitude);
        if (at && !placed) canvas.flyTo(at, ZOOM.municipality);
        break;
      }
      case 'address':
        if (placed) {
          canvas.flyTo(placed, ZOOM.asset - 1);
          this.haptics.success();
          this.announce(`Asset placed at ${formatPosition(placed, 5)}`);
        }
        break;
    }
  }

  private async flyToProvince(province: Province): Promise<void> {
    try {
      const capital = province.name.split(/[\s-]/)[0];
      const [town] = await this.geo.municipalities(capital, { province: province.abbreviation }, 1);
      const at = toPosition(town?.latitude, town?.longitude);
      if (at && !this.position()) this.canvas().flyTo(at, ZOOM.province);
    } catch {
      // The flight is a courtesy; the form works without it.
    }
  }

  private cleared(model: SurveyModel, field: SurveyKey): SurveyModel {
    const next = { ...model } as Record<SurveyKey, unknown>;
    for (const key of [...(DEPENDANTS[field] ?? []), ...(this.steps.get(field)?.derived ?? [])]) {
      next[key] = key === 'latitude' || key === 'longitude' ? null : '';
      delete this.committed[key];
    }
    return next as unknown as SurveyModel;
  }

  private offerUndo(before: SurveyModel, field: SurveyKey): void {
    const label = this.fields().get(field)?.label.toLowerCase() ?? 'place';
    toast(`The ${label} changed`, {
      description: 'Answers that belonged to the previous one were cleared.',
      action: {
        label: 'Undo',
        onClick: () => {
          this.model.set(before);
          this.commitAll(before);
        },
      },
    });
  }

  private flash(fields: readonly string[]): void {
    if (!fields.length) return;
    clearTimeout(this.flashTimer);
    this.flashed.set(new Set(fields));
    this.flashTimer = setTimeout(() => this.flashed.set(new Set()), 1600);
  }

  // ── Position ───────────────────────────────────────────────────────────────

  protected onCapture(position: LatLng): void {
    if (this.readOnly() || this.submitted()) return;
    this.model.update((model) => ({ ...model, latitude: roundCoordinate(position.lat), longitude: roundCoordinate(position.lng) }));
    this.form.latitude().markAsTouched();
    this.flash(['latitude', 'longitude']);
    this.announce(`Asset placed at ${formatPosition(position, 5)}`);
    if (this.viewport.isHandset() && this.sheetSnap() === 'full') this.sheetSnap.set('half');
  }

  protected placeAtCentre(): void {
    const centre = this.canvas().visibleCenter();
    if (centre) this.onCapture(centre);
  }

  protected clearPosition(): void {
    this.model.update((model) => ({ ...model, latitude: null, longitude: null }));
  }

  protected canLocateAddress(): boolean {
    const model = this.model();
    return !!model.address.trim() && !!(model.municipality.trim() || model.provinceName.trim());
  }

  /** Turns a street typed without choosing a suggestion into a position. */
  protected async locateAddress(): Promise<void> {
    const model = this.model();
    this.locatingAddress.set(true);
    try {
      const [match] = await this.geo.addresses({
        street: [model.address, model.houseNumber].filter((part) => part.trim()).join(' '),
        municipality: model.municipality.trim() || undefined,
        province: model.provinceName.trim() || undefined,
        limit: 1,
      });
      const at = toPosition(match?.latitude, match?.longitude);
      if (!at) {
        toast.error('That address could not be found', { description: 'Check the street and number, or place the pin on the map yourself.' });
        return;
      }
      this.model.update((current) => ({
        ...current,
        latitude: roundCoordinate(at.lat),
        longitude: roundCoordinate(at.lng),
        postalCode: current.postalCode || match.postalCode || '',
      }));
      this.flash(['latitude', 'longitude']);
      this.canvas().flyTo(at, ZOOM.asset - 1);
      this.haptics.success();
    } catch (error) {
      toast.error('The address search failed', { description: ApiError.from(error).message });
    } finally {
      this.locatingAddress.set(false);
    }
  }

  /** Pasting "45.46, 9.19" into either coordinate fills both. */
  protected pastePosition(event: ClipboardEvent): void {
    const parsed = parsePosition(event.clipboardData?.getData('text') ?? '');
    if (!parsed) return;
    event.preventDefault();
    this.onCapture(parsed);
    this.canvas().flyTo(parsed, ZOOM.asset - 1);
  }

  protected copyPosition(): void {
    const position = this.position();
    if (position) void copyToClipboard(formatPosition(position), 'Coordinates copied');
  }

  protected onPointSelected(point: MapPoint): void {
    this.selectedPoint.set(point);
    this.haptics.tap();
  }

  // ── Saving ─────────────────────────────────────────────────────────────────

  protected async save(intent: 'draft' | 'submit'): Promise<void> {
    if (this.saving() || this.readOnly() || this.submitted()) return;
    this.saving.set(intent);
    try {
      const accepted = await submit(this.form, async () => {
        try {
          this.afterSave(await this.persist(intent), intent);
          return undefined;
        } catch (error) {
          return this.refusal(error);
        }
      });
      if (!accepted) this.revealProblems();
    } finally {
      this.saving.set(null);
    }
  }

  private async persist(intent: 'draft' | 'submit'): Promise<Registration> {
    const request = toRequest(this.model());
    const existing = this.registration();
    let saved = existing ? await this.registrations.update(existing.id, request) : await this.registrations.create(request);
    if (!existing) {
      this.drafts.remove(null);
      this.registration.set(saved);
    }
    if (intent === 'submit' && saved.status !== 'SUBMITTED') {
      saved = await this.registrations.changeStatus(saved.id, { status: 'SUBMITTED' });
    }
    return saved;
  }

  private afterSave(saved: Registration, intent: 'draft' | 'submit'): void {
    const model = fromRegistration(saved);
    this.registration.set(saved);
    this.model.set(model);
    this.baseline.set(model);
    this.commitAll(model);
    this.keptLocallyAt.set(null);
    this.drafts.remove(saved.id);

    this.queries.setQueryData(keys.registrations.detail(saved.id), saved);
    void this.queries.invalidateQueries({ queryKey: keys.registrations.all, refetchType: 'active' });

    if (this.id() !== saved.id) {
      this.loadedId = saved.id;
      void this.router.navigate(['/survey', saved.id], { replaceUrl: true });
    }

    this.haptics.success();
    if (intent === 'submit') {
      this.submitted.set(saved);
      if (this.viewport.isHandset()) this.sheetSnap.set('half');
    } else {
      toast.success('Draft saved', { description: `${saved.assetName}, ${saved.municipality}` });
    }
  }

  /** Maps a refusal onto the fields it concerns; anything else is said once, in a toast. */
  private refusal(error: unknown): TreeValidationResult {
    const failure = ApiError.from(error);
    const violations = failure.violations.filter((violation) => violation.field in EMPTY_SURVEY);

    if (violations.length) {
      toast.error('Some answers were not accepted', { description: 'The fields concerned are marked.' });
      return violations.map((violation) => ({ kind: 'server', message: violation.message, fieldTree: this.text(violation.field) }));
    }
    if (failure.status === 409) {
      toast.error('Already registered', { description: failure.message });
      return [{ kind: 'server', message: failure.message, fieldTree: this.form.assetName }];
    }
    toast.error(failure.isNetworkFailure ? 'Not saved: the server cannot be reached' : 'Not saved', {
      description: failure.isNetworkFailure ? 'Your work is kept on this device. Try again once the connection is back.' : failure.message,
    });
    return undefined;
  }

  private revealProblems(): void {
    this.haptics.warning();
    const problems = this.form().errorSummary().length;
    if (problems) toast.error(problems === 1 ? 'One answer needs attention' : `${problems} answers need attention`);
    if (this.viewport.isHandset()) this.sheetSnap.set('full');
    else this.panelOpen.set(true);

    setTimeout(() => {
      const first = this.host.nativeElement.querySelector<HTMLElement>('.bm-field__control.has-error');
      if (!first) return;
      first.scrollIntoView({ block: 'center', behavior: this.preferences.reducedMotion() ? 'auto' : 'smooth' });
      first.classList.remove('bm-shake');
      void first.offsetWidth;
      first.classList.add('bm-shake');
      first.querySelector<HTMLElement>('input, textarea')?.focus({ preventScroll: true });
    }, 80);
  }

  // ── Lifecycle actions ──────────────────────────────────────────────────────

  /** A fresh form that keeps the place, for the next asset on the same street. */
  protected startAnother(): void {
    const { region, provinceName, provinceCode, municipality, istatCode, cadastralCode } = this.model();
    this.startBlank();
    this.restorable.set(null);
    const kept = { ...EMPTY_SURVEY, region, provinceName, provinceCode, municipality, istatCode, cadastralCode };
    this.model.set(kept);
    this.commitAll(kept);
    void this.flyToPlace(kept);
    void this.router.navigate(['/survey']);
    if (this.viewport.isHandset()) this.sheetSnap.set('full');
  }

  protected async startOver(): Promise<void> {
    if (!isBlank(this.model())) {
      const { confirmed } = await this.confirm.ask({
        title: 'Start over?',
        message: 'Everything entered in this form is cleared. Registrations already saved are not affected.',
        confirmLabel: 'Clear the form',
        tone: 'danger',
        icon: 'rotate-ccw',
      });
      if (!confirmed) return;
    }
    this.drafts.remove(this.registration()?.id ?? null);
    if (this.registration()) void this.router.navigate(['/survey']);
    else this.startBlank();
  }

  protected revert(): void {
    this.model.set(this.baseline());
    this.commitAll(this.baseline());
    this.drafts.remove(this.registration()?.id ?? null);
    this.keptLocallyAt.set(null);
    this.form().reset();
    toast('Changes discarded');
  }

  protected async deleteDraft(): Promise<void> {
    const saved = this.registration();
    if (!saved) return;
    const { confirmed } = await this.confirm.ask({
      title: 'Delete this draft?',
      message: `“${saved.assetName}” in ${saved.municipality} is removed for good.`,
      confirmLabel: 'Delete draft',
      tone: 'danger',
      icon: 'trash',
    });
    if (!confirmed) return;
    try {
      await this.registrations.delete(saved.id);
      this.drafts.remove(saved.id);
      void this.queries.invalidateQueries({ queryKey: keys.registrations.all });
      toast.success('Draft deleted');
      void this.router.navigate(['/survey']);
    } catch (error) {
      toast.error('The draft could not be deleted', { description: ApiError.from(error).message });
    }
  }

  protected restore(): void {
    const draft = this.restorable();
    if (!draft) return;
    this.model.set(draft.model);
    this.commitAll(draft.model);
    this.restorable.set(null);
    void this.flyToPlace(draft.model);
    toast.success('Your earlier work is back');
  }

  protected discardRestorable(): void {
    this.drafts.remove(this.registration()?.id ?? null);
    this.restorable.set(null);
  }

  protected togglePanel(): void {
    if (this.viewport.isHandset()) {
      this.sheetSnap.set(this.sheetSnap() === 'peek' ? 'half' : 'peek');
      return;
    }
    this.panelOpen.update((open) => !open);
    this.haptics.tap();
  }

  protected onSheetHeight(height: number): void {
    this.sheetHeight.set(height);
  }

  protected onFieldFocus(): void {
    if (this.viewport.isHandset() && this.sheetSnap() !== 'full') this.sheetSnap.set('full');
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private load(record: Registration): void {
    this.loadedId = record.id;
    const model = fromRegistration(record);
    this.registration.set(record);
    this.submitted.set(null);
    this.model.set(model);
    this.baseline.set(model);
    this.commitAll(model);
    this.keptLocallyAt.set(null);
    this.form().reset();

    const local = this.drafts.read(record.id);
    this.restorable.set(local && local.savedAt > record.updatedAt && !sameModel(local.model, model) ? local : null);

    void this.flyToPlace(model);
  }

  /** To the pin when there is one, otherwise to the municipality, otherwise to the region. */
  private async flyToPlace(model: SurveyModel): Promise<void> {
    const at = toPosition(model.latitude, model.longitude);
    if (at) {
      this.canvas().flyTo(at, ZOOM.asset - 1);
      return;
    }
    if (/^\d{6}$/.test(model.istatCode)) {
      try {
        const town = await this.geo.municipality(model.istatCode);
        const place = toPosition(town.latitude, town.longitude);
        if (place) {
          this.canvas().flyTo(place, ZOOM.municipality);
          return;
        }
      } catch {
        // Fall back to the region below.
      }
    }
    const region = regionView(model.region);
    if (region) this.canvas().flyTo(region.center, region.zoom);
  }

  private async startIn(istat: string): Promise<void> {
    void this.router.navigate([], { queryParams: { istat: null }, queryParamsHandling: 'merge', replaceUrl: true });
    try {
      const place = await this.geo.municipality(istat);
      if (this.id() || this.model().municipality.trim()) return;
      this.onPicked('municipality', { value: place, label: place.name });
    } catch {
      toast.error('That municipality could not be found', { description: `No municipality has the ISTAT code ${istat}.` });
    }
  }

  private startBlank(): void {
    this.loadedId = null;
    this.registration.set(null);
    this.submitted.set(null);
    this.model.set({ ...EMPTY_SURVEY });
    this.baseline.set({ ...EMPTY_SURVEY });
    this.committed = {};
    this.keptLocallyAt.set(null);
    this.form().reset();

    const local = this.drafts.read(null);
    this.restorable.set(local && !isBlank(local.model) ? local : null);
  }

  private commitAll(model: SurveyModel): void {
    this.committed = {};
    for (const key of this.steps.keys()) this.committed[key] = String(model[key] ?? '');
  }

  private announce(message: string): void {
    this.announcement.set('');
    queueMicrotask(() => this.announcement.set(message));
  }
}

function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  return !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}
