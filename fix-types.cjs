const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'lib', 'components', 'ui');

let buttonPath = path.join(componentsDir, 'button', 'button.svelte');
let buttonContent = fs.readFileSync(buttonPath, 'utf-8');
buttonContent = buttonContent.replace(/export type ButtonProps = ButtonPropsBase &.*?\n.*?AnchorProps & \{/s, 'export type ButtonProps = HTMLButtonAttributes & HTMLAnchorAttributes & { ref?: HTMLElement | null }\n& {');
buttonContent = buttonContent.replace(/ref\?:\s*HTMLButtonElement\s*\|\s*null/g, 'ref?: HTMLElement | null');
fs.writeFileSync(buttonPath, buttonContent);

let badgePath = path.join(componentsDir, 'badge', 'badge.svelte');
let badgeContent = fs.readFileSync(badgePath, 'utf-8');
badgeContent = badgeContent.replace(/AnchorProps/g, 'HTMLAnchorAttributes & { ref?: HTMLElement | null }');
fs.writeFileSync(badgePath, badgeContent);

console.log('Fixed intersection refs');
