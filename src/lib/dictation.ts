// Conservative cleanup: leave intentional emphasis and repeated phrases intact.
export function cleanDictation(text: string): string {
    return text.replace(/\b(?:um+|uh+|erm+)\b[,\s]*/gi, ' ')
        .replace(/\b([a-z]{1,2})-\s*(?:\1-\s*)*([a-z]+)\b/gi, (whole, prefix: string, word: string) => word.toLowerCase().startsWith(prefix.toLowerCase()) ? word : whole)
        .replace(/\b(I|the|a|an|to|and)(?:\s+\1\b)+/gi, '$1')
        .replace(/\s+([,.!?])/g, '$1').replace(/[ \t]+/g, ' ').trim();
}
