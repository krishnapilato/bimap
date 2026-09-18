import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

/** The small part of Google Identity Services this app uses. */
interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
    itp_support?: boolean;
    use_fedcm_for_button?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with';
      shape?: 'rectangular' | 'pill';
      logo_alignment?: 'left' | 'center';
      width?: number;
      locale?: string;
    },
  ): void;
  cancel(): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

export type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with';

/**
 * Google sign-in without a client secret: Google hands the browser an ID token, the IAM service
 * verifies it and answers with a BiMap session.
 */
@Injectable({ providedIn: 'root' })
export class GoogleIdentity {
  readonly enabled = environment.googleClientId.length > 0;
  private script: Promise<GoogleAccountsId> | null = null;

  /**
   * Draws Google's own button into `host`. Its look is Google's to decide, which is also what their
   * branding rules require, so only width and wording are chosen here.
   */
  async renderButton(host: HTMLElement, text: GoogleButtonText, onCredential: (idToken: string) => void): Promise<void> {
    const accounts = await this.load();
    accounts.initialize({
      client_id: environment.googleClientId,
      callback: (response) => onCredential(response.credential),
      ux_mode: 'popup',
      itp_support: true,
      use_fedcm_for_button: true,
    });
    accounts.renderButton(host, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      logo_alignment: 'center',
      text,
      width: Math.min(Math.max(Math.round(host.getBoundingClientRect().width), 240), 400),
    });
  }

  private load(): Promise<GoogleAccountsId> {
    this.script ??= new Promise<GoogleAccountsId>((resolve, reject) => {
      const ready = () => {
        const id = window.google?.accounts?.id;
        if (id) resolve(id);
        else reject(new Error('Google Identity Services loaded without an API'));
      };
      if (window.google?.accounts?.id) return ready();

      const element = document.createElement('script');
      element.src = SCRIPT_URL;
      element.async = true;
      element.defer = true;
      element.onload = ready;
      element.onerror = () => {
        this.script = null;
        reject(new Error('Google Identity Services could not be loaded'));
      };
      document.head.appendChild(element);
    });
    return this.script;
  }
}
