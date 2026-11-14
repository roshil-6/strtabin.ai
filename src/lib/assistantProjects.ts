const words = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * The project a message names, e.g. "build the flow for my Coffee cart project".
 * Matches whole words, ignores case and punctuation, prefers the longest name, and
 * returns nothing when two different projects match equally well.
 */
export function projectNamedIn(message: string, projects: { id: string; name: string }[]): string {
    const text = ` ${words(message)} `;
    let best = '', bestLength = 0, tie = false;
    for (const project of projects) {
        const name = words(project.name);
        if (name.length < 3 || name === 'untitled project' || !text.includes(` ${name} `)) continue;
        if (name.length > bestLength) { best = project.id; bestLength = name.length; tie = false; }
        else if (name.length === bestLength && project.id !== best) tie = true;
    }
    return tie ? '' : best;
}
