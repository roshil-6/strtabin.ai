export type WritingPage = { id: string; parentId: string; title: string; content: string; kind?: 'page' | 'part' | 'section' | 'scene' };
export const ROOT_PAGE = 'root';
export function pageAncestors(pages: WritingPage[], id: string): WritingPage[] {
    const result: WritingPage[] = [];
    const seen = new Set<string>();
    let current = pages.find(page => page.id === id);
    while (current && !seen.has(current.id)) {
        seen.add(current.id); result.unshift(current);
        current = pages.find(page => page.id === current!.parentId);
    }
    return result;
}
export function appendWritingBranch(pages: WritingPage[], parentId: string, title: string, children: string[], makeId: () => string): { pages: WritingPage[]; id: string } {
    if (parentId !== ROOT_PAGE && !pages.some(page => page.id === parentId)) throw new Error('Parent page no longer exists.');
    if (pages.length + children.length + 1 > 100) throw new Error('A project can contain up to 100 pages.');
    const id = makeId();
    return { id, pages: [...pages, { id, parentId, title: title.trim() || 'Untitled page', content: '' }, ...children.map((name, index) => ({ id: makeId(), parentId: id, title: name.trim() || `Page ${index + 1}`, content: '' }))] };
}

export function moveWritingPage(pages: WritingPage[], id: string, parentId: string): WritingPage[] {
    if (!pages.some(page => page.id === id)) throw new Error('Page no longer exists.');
    if (parentId !== ROOT_PAGE && !pages.some(page => page.id === parentId)) throw new Error('Parent no longer exists.');
    if (id === parentId || pageAncestors(pages, parentId).some(page => page.id === id)) throw new Error('A section cannot be moved inside itself.');
    return pages.map(page => page.id === id ? { ...page, parentId } : page);
}

export const writingKindLabel = (kind?: WritingPage['kind']) => kind === 'scene' ? 'note' : kind || 'page';
