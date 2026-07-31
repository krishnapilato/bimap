import { Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

import { ThemeService } from '../../core/theme.service';
import { AuthService } from '../../auth/auth.service';

/**
 * The chrome shared by every authenticated page.
 *
 * Previously each page rendered its own header — two different brand lockups,
 * two sets of action buttons, and duplicated CSS. Centralising it means the
 * masthead is identical everywhere and page-specific controls are projected in
 * through the `shellActions` slot.
 */
@Component({
  selector: 'bm-app-shell',
  standalone: true,
  imports: [RouterModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);

  /** Short context label shown beside the wordmark, e.g. "Administration". */
  readonly section = input<string>('');

  /** Lets a page opt out of the default max-width content frame (the map view). */
  readonly wide = input(false, { transform: booleanAttribute });

  readonly isDark = computed(() => this.theme.resolved() === 'dark');

  readonly user = computed(() => this.auth.loginResponseValue?.user);

  readonly isAdmin = computed(() => this.user()?.applicationRole === 'ADMINISTRATOR');

  readonly displayName = computed(() => {
    const user = this.user();
    const full = user?.fullName?.trim();

    if (full) return full;

    return [user?.name, user?.surname].filter(Boolean).join(' ').trim() || 'Signed in';
  });

  readonly initials = computed(() => {
    const user = this.user();
    const letters = `${user?.name?.trim().charAt(0) ?? ''}${user?.surname?.trim().charAt(0) ?? ''}`;

    return letters.toUpperCase() || 'U';
  });

  readonly roleLabel = computed(() => {
    const role = this.user()?.applicationRole ?? '';

    return role ? role.charAt(0) + role.slice(1).toLowerCase() : '';
  });

  toggleTheme(): void {
    this.theme.toggle();
  }
}
