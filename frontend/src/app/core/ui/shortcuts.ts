import { KeybindingsMap, defaultKeybindingsHandlerIgnore, tinykeys } from 'tinykeys';

/**
 * Keyboard shortcuts for the whole window.
 *
 * tinykeys skips every key pressed inside a field, which is right for single letters but wrong for
 * chords: Ctrl S is pressed precisely while someone is typing. Chords with Ctrl or ⌘ always reach
 * their handler; plain keys still never fire from inside a field.
 */
export function bindShortcuts(bindings: KeybindingsMap): () => void {
  return tinykeys(window, bindings, {
    ignore: (event) => (event.ctrlKey || event.metaKey ? event.repeat || event.isComposing : defaultKeybindingsHandlerIgnore(event)),
  });
}
