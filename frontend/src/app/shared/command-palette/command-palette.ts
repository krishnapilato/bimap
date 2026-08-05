import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { Command, CommandService } from '../../core/commands/command.service';
import { MotionService } from '../../core/motion';

interface CommandGroup {
  name: string;
  commands: Command[];
}

@Component({
  selector: 'bm-command-palette',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  templateUrl: './command-palette.html',
  styleUrl: './command-palette.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPaletteComponent {
  private readonly commandService = inject(CommandService);
  private readonly motion = inject(MotionService);

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly backdrop = viewChild<ElementRef<HTMLElement>>('backdrop');
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  readonly isOpen = this.commandService.isOpen;
  readonly query = signal('');
  readonly activeIndex = signal(0);

  /** Flat, ranked list — the source of truth for keyboard selection. */
  readonly results = computed(() => {
    const query = this.query().trim().toLowerCase();
    const commands = this.commandService.commands();

    if (!query) return [...commands];

    return commands
      .map((command) => ({ command, score: this.score(command, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.command);
  });

  /** The same list arranged for display, preserving the ranked order. */
  readonly groups = computed<CommandGroup[]>(() => {
    const groups: CommandGroup[] = [];

    for (const command of this.results()) {
      const existing = groups.find((group) => group.name === command.group);

      if (existing) existing.commands.push(command);
      else groups.push({ name: command.group, commands: [command] });
    }

    return groups;
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) this.onOpened();
    });

    // Any change to the result set invalidates the current selection.
    effect(() => {
      this.results();
      this.activeIndex.set(0);
    });
  }

  /**
   * ⌘K / Ctrl+K anywhere, including from inside a text field — the palette is
   * how you leave a half-filled form without hunting for the nav.
   */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.commandService.toggle();
      return;
    }

    if (!this.isOpen()) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.move(-1);
        break;
      case 'Enter': {
        event.preventDefault();
        const command = this.results()[this.activeIndex()];
        if (command) this.run(command);
        break;
      }
    }
  }

  /** Flat index of a command, so grouped markup can still highlight correctly. */
  indexOf(command: Command): number {
    return this.results().indexOf(command);
  }

  run(command: Command): void {
    this.dismiss(() => this.commandService.execute(command));
  }

  close(): void {
    this.dismiss(() => this.commandService.close());
  }

  private move(delta: number): void {
    const total = this.results().length;
    if (!total) return;

    // Wraps, so holding ArrowDown cycles rather than dead-ending.
    this.activeIndex.update((index) => (index + delta + total) % total);

    requestAnimationFrame(() => {
      this.panel()
        ?.nativeElement.querySelector('.command.is-active')
        ?.scrollIntoView({ block: 'nearest' });
    });
  }

  private onOpened(): void {
    this.query.set('');
    this.activeIndex.set(0);

    requestAnimationFrame(() => {
      this.field()?.nativeElement.focus();

      const panel = this.panel()?.nativeElement;
      const backdrop = this.backdrop()?.nativeElement;
      if (!panel || !backdrop) return;

      this.motion
        .timeline()
        .fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.3 })
        .fromTo(
          panel,
          { opacity: 0, y: -22, scale: 0.96, filter: 'blur(10px)' },
          { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.5, ease: 'bmArrive' },
          '-=0.22',
        )
        .fromTo(
          panel.querySelectorAll('.command'),
          { opacity: 0, x: -14 },
          { opacity: 1, x: 0, duration: 0.4, stagger: 0.028, ease: 'bmGlide' },
          '-=0.3',
        );
    });
  }

  /**
   * Runs the exit animation, then the action. Deferring the action keeps the
   * palette on screen while it collapses — dismissing first would tear the
   * panel away mid-tween as the next route mounts.
   */
  private dismiss(then: () => void): void {
    const panel = this.panel()?.nativeElement;
    const backdrop = this.backdrop()?.nativeElement;

    if (!panel || !backdrop || !this.motion.enabled()) {
      then();
      return;
    }

    this.motion
      .timeline({ onComplete: then })
      .to(panel, { opacity: 0, y: -14, scale: 0.97, duration: 0.22, ease: 'power2.in' })
      .to(backdrop, { opacity: 0, duration: 0.2 }, '-=0.16');
  }

  /**
   * Ranks a command against the query. An exact prefix beats a word-start match,
   * which beats a loose subsequence — so typing "us" puts "Users" above
   * "Asset workspace" even though both contain the letters in order.
   */
  private score(command: Command, query: string): number {
    const label = command.label.toLowerCase();
    const haystack = `${label} ${command.group} ${command.hint ?? ''} ${command.keywords ?? ''}`
      .toLowerCase()
      .trim();

    if (label.startsWith(query)) return 1000;
    if (label.includes(query)) return 800;
    if (haystack.includes(query)) return 500;

    // Subsequence: every query character appears in order somewhere.
    let cursor = 0;

    for (const character of query) {
      cursor = haystack.indexOf(character, cursor);
      if (cursor === -1) return 0;
      cursor += 1;
    }

    return 100;
  }
}
