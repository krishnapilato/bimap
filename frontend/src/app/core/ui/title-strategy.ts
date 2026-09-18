import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/** "Registry · BiMap" in the tab, so a surveyor with six tabs open can tell them apart. */
@Injectable()
export class BimapTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const section = this.buildTitle(snapshot);
    this.title.setTitle(section ? `${section} · BiMap` : 'BiMap');
  }
}
