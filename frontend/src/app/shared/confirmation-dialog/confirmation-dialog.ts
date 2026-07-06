import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

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
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './confirmation-dialog.html',
  styleUrls: ['./confirmation-dialog.scss'],
})
export class ConfirmationDialogComponent {
  readonly data = inject<ConfirmationDialogData>(MAT_DIALOG_DATA);

  private readonly dialogRef = inject(MatDialogRef<ConfirmationDialogComponent>);

  readonly titleId = 'confirmation-dialog-title';
  readonly messageId = 'confirmation-dialog-message';

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
}
