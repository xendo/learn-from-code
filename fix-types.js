const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const componentsDir = path.join(__dirname, 'src', 'lib', 'components', 'ui');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;

    // Remove import { cn, WithElementRef } ...
    if (content.includes('WithElementRef')) {
        content = content.replace(/,\s*type\s+WithElementRef/g, '');
        content = content.replace(/type\s+WithElementRef\s*,\s*/g, '');
        content = content.replace(/import\s*{\s*cn\s*}\s*from\s*"([^"]+)"/, 'import { cn } from "$1"');
        changed = true;
    }

    if (content.includes('WithElementRef<')) {
        content = content.replace(/WithElementRef<([^>]+)>/g, '$1 & { ref?: HTMLElement | null }');
        changed = true;
    }

    if (content.includes('WithoutChildren<')) {
       content = content.replace(/WithoutChildren<([^>]+)>/g, 'Omit<$1, "children">');
       changed = true;
    }
    
    if (content.includes('WithoutChildrenOrChild<')) {
       content = content.replace(/WithoutChildrenOrChild<([^>]+)>/g, 'Omit<$1, "children" | "child">');
       changed = true;
    }


    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.svelte')) {
            processFile(fullPath);
        }
    }
}

walkDir(componentsDir);
console.log('Done fixing Svelte types in components.');
