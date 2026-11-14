import type { LayoutOption } from './viewPreferences';

/**
 * Layout requests the app understands on its own, so they work even when the AI model misreads them
 * ("make it dark", "side by side", "show projects as a board", "make the flow vertical").
 */
const VERB = String.raw`(?:switch|change|set|turn|make|go|put|use|move|show|display|view|enable|start|open|give me|i want|can you|please)`;
const RULES: [RegExp, LayoutOption][] = [
    [/\b(split[\s-]*(the )?(view|screen|mode|layout)|side[\s-]*by[\s-]*side|two[\s-]*(panes?|panels?|columns?))\b/i, 'split'],
    [/\b(single|one)[\s-]*(view|pane|panel|section|column)\b|\b(close|exit|turn off|leave|stop) (the )?split\b/i, 'single'],
    [/\b(board|kanban|stages?) (view|layout)\b|\b(projects?|dashboard)\b.*\b(as|into|on|to) (a )?(board|kanban)\b/i, 'board'],
    [/\b(cards?|grid|tiles?) (view|layout)\b|\b(projects?|dashboard)\b.*\b(as|into|to) (cards|a grid|tiles)\b/i, 'cards'],
    [/\b(exit|leave|turn off|stop|disable|end|close) (the )?(focus|distraction[\s-]*free|zen)( mode| writing| view)?\b/i, 'unfocus'],
    [/\b(focus|zen|distraction[\s-]*free) (mode|writing|view)\b|\bdistraction[\s-]*free\b|\bzen mode\b/i, 'focus'],
    [new RegExp(String.raw`\b(dark|night) (mode|theme)\b|\b${VERB}\b[^.]{0,20}\b(to |it )?dark\b`, 'i'), 'dark'],
    [new RegExp(String.raw`\b(light|day|bright) (mode|theme)\b|\b${VERB}\b[^.]{0,20}\b(to |it )?light\b(?! of)`, 'i'), 'light'],
    [/\b(system|auto(matic)?|device) (theme|mode)\b|\btheme (to )?(system|auto)\b/i, 'system'],
    [/\b(bigger|larger|increase|enlarge)\b (the )?(text|font|writing)\b|\b(text|font)( size)?\b (bigger|larger|large)\b/i, 'text-large'],
    [/\b(smaller|decrease|shrink)\b (the )?(text|font|writing)\b|\b(text|font)( size)?\b (smaller|small)\b/i, 'text-small'],
    [/\b(normal|default|medium|regular|reset)\b (the )?(text|font)( size)?\b|\b(text|font)( size)?\b (to )?(normal|default|medium|regular)\b/i, 'text-medium'],
];
const VERTICAL = /\b(vertical(ly)?|top[\s-]*(to|down)[\s-]*(bottom)?|portrait|downwards?|tree from the top)\b/i;
const HORIZONTAL = /\b(horizontal(ly)?|left[\s-]*to[\s-]*right|landscape|sideways)\b/i;
const FLOW = /\b(flow|map|mind[\s-]*map|diagram|ideas|board|tree|orientation|arrange|re-?arrange|organi[sz]e|tidy|layout)\b/i;

export function layoutIntents(message: string): { layouts: LayoutOption[]; orientation: '' | 'horizontal' | 'vertical' } {
    const text = message.replace(/\s+/g, ' ');
    const layouts: LayoutOption[] = [];
    for (const [pattern, option] of RULES) {
        if (!pattern.test(text) || layouts.includes(option)) continue;
        // "exit focus" must not also turn focus on; "light" in "dark" requests is not a theme switch.
        if (option === 'focus' && layouts.includes('unfocus')) continue;
        if (option === 'light' && layouts.includes('dark')) continue;
        layouts.push(option);
    }
    const orientation = FLOW.test(text) ? (VERTICAL.test(text) ? 'vertical' : HORIZONTAL.test(text) ? 'horizontal' : '') : '';
    return { layouts, orientation };
}

/** A short message that only asks for layout changes, which the app can do without the AI. */
export function isLayoutOnly(message: string): boolean {
    const { layouts, orientation } = layoutIntents(message);
    if (!layouts.length || orientation) return false;
    const rest = message.toLowerCase()
        .replace(/\b(please|pls|can you|could you|would you|sasha|hey|hi|now|the|my|me|to|a|an|and|then|also|in|on|into|as|of|it|app|screen|page|view|mode|theme|layout|show|switch|change|make|set|turn|use|put|go|open|enable|i want|want|like|let's|lets|with|for)\b/g, ' ')
        .replace(/\b(split|side|by|two|pane|panel|column|columns|single|one|section|board|kanban|stage|stages|cards?|grid|tiles?|focus|distraction|free|zen|exit|leave|off|stop|disable|end|close|dark|night|light|day|bright|system|auto|automatic|device|bigger|larger|large|increase|zoom|smaller|small|decrease|normal|default|medium|regular|reset|text|font|size|writing|projects?|both|flow)\b/g, ' ')
        .replace(/[^a-z]+/g, '');
    return rest.length === 0;
}
