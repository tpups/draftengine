// updateActiveContext.js
//
// Updates a section in activeContext.md by adding a new entry as #1 and incrementing all existing entries.
//
// Usage:
//   cd scripts
//   node updateActiveContext.js "section name" "entry content"
//
// Example:
//   node updateActiveContext.js "Recent Changes" "$(Get-Content newEntry.txt -Raw)"
//
// Notes:
// - Entry content should follow the existing format (indentation, bullet points, etc.)
// - Section name must match exactly (e.g., "Recent Changes")
// - In PowerShell, use Get-Content with -Raw to preserve newlines
// - Run from the scripts directory

import fs from 'fs';
import path from 'path';

// Get command line arguments
const [,, section, ...entryLines] = process.argv;
const entry = entryLines.join('\n');

if (!section || !entry) {
    console.error('Usage: node updateActiveContext.js "section name" "entry content"');
    process.exit(1);
}

// Read the file
const filePath = path.join(process.cwd(), '..', 'cline_docs', 'activeContext.md');
let content = fs.readFileSync(filePath, 'utf8');

// Find the section
const sectionRegex = new RegExp(`## ${section}[\\s\\S]*?(?=\\n## |$)`);
const sectionMatch = content.match(sectionRegex);

if (!sectionMatch) {
    console.error(`Section "${section}" not found`);
    process.exit(1);
}

// Get the section content
let sectionContent = sectionMatch[0];

// Split into lines for processing
const lines = sectionContent.split('\n');

// Find where entries start (after any introductory text)
let entryStartIndex = 0;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\d+\./)) {
        entryStartIndex = i;
        break;
    }
}

// Extract the entries
const entries = [];
let currentEntry = [];
for (let i = entryStartIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^\d+\./)) {
        if (currentEntry.length > 0) {
            entries.push(currentEntry.join('\n'));
        }
        currentEntry = [line];
    } else if (line.trim() !== '') {
        currentEntry.push(line);
    }
}
if (currentEntry.length > 0) {
    entries.push(currentEntry.join('\n'));
}

// Increment all entry numbers
const updatedEntries = entries.map(entry => {
    return entry.replace(/^\d+/, num => parseInt(num) + 1);
});

// Add new entry as #1
const newEntry = `1. ${entry}`;

// Combine everything back
const beforeSection = content.substring(0, sectionMatch.index);
const afterSection = content.substring(sectionMatch.index + sectionMatch[0].length);

// Reconstruct the section
const newSectionContent = [
    `## ${section}`,
    '',
    newEntry,
    ...updatedEntries
].join('\n');

// Update the file
const newContent = beforeSection + newSectionContent + afterSection;
fs.writeFileSync(filePath, newContent);

console.log('Successfully updated activeContext.md');
