/**
 * Layout preferences shared between the screens and Sasha. Setting one saves it and tells any open
 * screen to update right away, so "switch to split view" works without a reload.
 */
export const VIEW_KEYS = {
    split: 'stratabin-split-view',
    projectView: 'stratabin:project-view',
    focusWriting: 'stratabin-writing-focus',
    fontSize: 'strab_editor_font_size',
} as const;
type ViewKey = keyof typeof VIEW_KEYS;
const EVENT = 'stratabin:view-preference';

export function setViewPreference(key: ViewKey, value: string) {
    try { localStorage.setItem(VIEW_KEYS[key], value); } catch { /* applies to the open screens only */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, value } }));
}

/** Calls back when Sasha (or another screen) changes this preference. */
export function onViewPreference(key: ViewKey, callback: (value: string) => void) {
    const listener = (event: Event) => { const detail = (event as CustomEvent<{ key: string; value: string }>).detail; if (detail?.key === key) callback(detail.value); };
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
}

/** Every layout Sasha can switch to. */
export const LAYOUT_OPTIONS = ['split', 'single', 'cards', 'board', 'focus', 'unfocus', 'light', 'dark', 'system', 'text-small', 'text-medium', 'text-large'] as const;
export type LayoutOption = typeof LAYOUT_OPTIONS[number];
const FONT = { 'text-small': 14, 'text-medium': 16, 'text-large': 20 } as const;

/** Apply a layout choice; the theme goes through the theme context. Returns a short description. */
export function applyLayout(option: string, setTheme: (theme: 'light' | 'dark' | 'system') => void): string {
    switch (option) {
        case 'split': setViewPreference('split', '1'); return 'Showing writing and flow side by side (on wide screens).';
        case 'single': setViewPreference('split', '0'); return 'Showing one section at a time.';
        case 'cards': setViewPreference('projectView', 'cards'); return 'Projects show as cards.';
        case 'board': setViewPreference('projectView', 'board'); return 'Projects show on the Idea → Done board.';
        case 'focus': setViewPreference('focusWriting', '1'); return 'Focus writing is on.';
        case 'unfocus': setViewPreference('focusWriting', '0'); return 'Focus writing is off.';
        case 'light': case 'dark': case 'system': setTheme(option); return `Theme set to ${option}.`;
        case 'text-small': case 'text-medium': case 'text-large': setViewPreference('fontSize', String(FONT[option])); return `Writing text is now ${option.slice(5)}.`;
        default: throw new Error('Unknown layout.');
    }
}
