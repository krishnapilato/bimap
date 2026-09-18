import { bindShortcuts } from './shortcuts';

describe('bindShortcuts', () => {
  let unbind: () => void;
  let field: HTMLInputElement;
  const save = vi.fn();
  const mode = vi.fn();

  beforeEach(() => {
    save.mockReset();
    mode.mockReset();
    field = document.body.appendChild(document.createElement('input'));
    unbind = bindShortcuts({ 'Control+KeyS': save, KeyM: mode });
  });

  afterEach(() => {
    unbind();
    field.remove();
  });

  const press = (target: EventTarget, init: KeyboardEventInit) => target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));

  it('lets a chord through while someone is typing, which is when Ctrl S is pressed', () => {
    press(field, { key: 's', code: 'KeyS', ctrlKey: true });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('keeps plain keys out of text fields', () => {
    press(field, { key: 'm', code: 'KeyM' });
    expect(mode).not.toHaveBeenCalled();

    press(document.body, { key: 'm', code: 'KeyM' });
    expect(mode).toHaveBeenCalledTimes(1);
  });
});
