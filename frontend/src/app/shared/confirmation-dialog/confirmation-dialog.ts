import {
  Component,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { MotionService } from '../../core/motion';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  details?: string;
  detailsLabel?: string;
  icon?: string;
  tone?: 'primary' | 'accent' | 'warn';
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.scss',
})
export class ConfirmationDialogComponent {
  readonly data = inject<ConfirmationDialogData>(MAT_DIALOG_DATA);

  private readonly dialogRef = inject(MatDialogRef<ConfirmationDialogComponent>);
  private readonly motion = inject(MotionService);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  readonly titleId = 'confirmation-dialog-title';
  readonly messageId = 'confirmation-dialog-message';

  constructor() {
    afterNextRender(() => this.playEntrance());
  }

  get resolvedTitle(): string {
    return this.data?.title?.trim() || 'Please confirm';
  }

  get resolvedMessage(): string {
    return this.data?.message?.trim() || 'Are you sure you want to continue?';
  }

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * The dialog assembles around its icon rather than fading in as a slab. A
   * confirmation is a question, and the mark that says what kind of question it
   * is should land first.
   */
  private playEntrance(): void {
    const host = this.dialog()?.nativeElement;

    if (!host || !this.motion.enabled()) return;

    this.motion
      .timeline()
      .from(host.querySelector('.dialog-icon'), {
        scale: 0.4,
        rotate: -35,
        opacity: 0,
        duration: 0.65,
        ease: 'bmArrive',
      })
      // Opacity only: the orbits' transforms belong to their CSS animations,
      // which run continuously and would override anything tweened here.
      .from(
        host.querySelectorAll('.dialog-orbit'),
        { opacity: 0, duration: 0.6, stagger: 0.08 },
        '-=0.5',
      )
      .from(
        host.querySelectorAll('.dialog-title, .dialog-message, .dialog-details, .dialog-actions'),
        { y: 16, opacity: 0, duration: 0.5, stagger: 0.06 },
        '-=0.4',
      );

    // A slow idle float once the entrance has settled, so a dialog left open
    // still feels alive. Driven from GSAP for the reason noted in the SCSS.
    this.motion.to(host.querySelector('.dialog-icon'), {
      y: -4,
      scale: 1.03,
      duration: 1.9,
      delay: 0.9,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }
}
