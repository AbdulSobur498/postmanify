import fs from 'fs';


// Extracts fields from: const { name, email } = req.body
const DESTRUCTURE_REGEX =  
    /const\s*\{([^}]+)\}\s*=\s*req\.body/g;

// Extracts fields from: req.body.fieldName
const DOT_ACCESS_REGEX = 
    /req\.body\.([\w]+)/g;

export function extractBodyFields(content: string): string[] {
    const fields: string[] = [];

    // Pattern 1: const { name, email } = req.body
    DESTRUCTURE_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = DESTRUCTURE_REGEX.exec(content)) !== null) {
        const names = match[1]
        .split(',')
        .map((f) => f.trim().split(':')[0].trim())  // handle rename: { name: n }
        .filter(Boolean);
        fields.push(...names);
    }

    // Pattern 2: req.body.name
    DOT_ACCESS_REGEX.lastIndex = 0;
    while ((match = DOT_ACCESS_REGEX.exec(content)) !== null) {
        if (!fields.includes(match[1])) {
            fields.push(match[1]);
        }
    }
    return [...new Set(fields)];  // remove duplicates
}

export function extractFunctionBody(content: string, handlerName: string): string {
    // Match: export const handlerName = async (req, res) => {
    // Match: export export function handlerName(req, res) {
    // Match: const handlerName = (req, res) => {
    const FUNC_REGEX = new RegExp(
        `(?:export\\s+)?(?:const|function)\\s+${handlerName}\\s*=?\\s*(?:async\\s*)?(?:\\([^)]*\\)|[\\w]+)\\s*=>?\\s*\\{`,
        'g'
    );

    FUNC_REGEX.lastIndex = 0;
    const match = FUNC_REGEX.exec(content);
    if (!match) return '';

    // Extract the function body by counting braces
    let depth = 0;
    let start = match.index;
    let i = start;

    while (i < content.length) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') {
            depth--;
            if (depth === 0) {
                return content.slice(start, i + 1);
            }
        }
        i++;
    }
    return '';
}