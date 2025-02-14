// updateMemoryBank.js
//
// Updates a section in any memory bank file by adding or deleting entries.
//
// Usage:
//   Add entry:    node updateMemoryBank.js add "filename" "section name" "entry content"
//   Delete entry: node updateMemoryBank.js delete "filename" "section name" entry_number
//
// Examples:
//   Add:    node updateMemoryBank.js add "activeContext.md" "Recent Changes" "$(Get-Content entry.txt -Raw)"
//   Add:    node updateMemoryBank.js add "progress.md" "Recent Achievements" "$(Get-Content entry.txt -Raw)"
//   Delete: node updateMemoryBank.js delete "activeContext.md" "Recent Changes" 5
//
// Notes:
// - Entry content should follow the existing format (indentation, bullet points, etc.)
// - Section name must match exactly (e.g., "Recent Changes")
// - In PowerShell, use Get-Content with -Raw to preserve newlines
// - When adding entries, entry.txt is automatically deleted after successful update
// - When deleting entries, remaining entries are automatically renumbered
// - Run from the scripts directory

import fs from 'fs';
import path from 'path';

// Get command line arguments
const [,, command, filename, section, ...args] = process.argv;

if (!command || !filename || !section || (command !== 'add' && command !== 'delete')) {
    console.error('Usage:');
    console.error('  Add entry:    node updateMemoryBank.js add "filename" "section name" "entry content"');
    console.error('  Delete entry: node updateMemoryBank.js delete "filename" "section name" entry_number');
    process.exit(1);
}

// Function to extract and process entries from section content
function processSection(sectionContent) {
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

    return entries;
}

// Function to handle adding a new entry
function addEntry(filename, section, entryContent) {
    const entry = args.join('\n');
    if (!entry) {
        console.error('Entry content is required for add command');
        process.exit(1);
    }

    // Read and process the file
    const filePath = path.join(process.cwd(), '..', 'cline_docs', filename);
    let content = fs.readFileSync(filePath, 'utf8');

    // Find the section
    const sectionRegex = new RegExp(`## ${section}[\\s\\S]*?(?=\\n## |$)`);
    const sectionMatch = content.match(sectionRegex);

    if (!sectionMatch) {
        console.error(`Section "${section}" not found`);
        process.exit(1);
    }

    // Get the section content and process entries
    let sectionContent = sectionMatch[0];
    const entries = processSection(sectionContent);

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

    // Delete the entry file if it exists
    const entryPath = path.join(process.cwd(), 'entry.txt');
    if (fs.existsSync(entryPath)) {
        fs.unlinkSync(entryPath);
        console.log(`Successfully updated ${filename} and cleaned up entry.txt`);
    } else {
        console.log(`Successfully updated ${filename}`);
    }
}

// Function to handle deleting an entry
function deleteEntry(filename, section, entryNumber) {
    const entryNum = parseInt(entryNumber);
    if (isNaN(entryNum) || entryNum < 1) {
        console.error('Entry number must be a positive integer');
        process.exit(1);
    }

    // Read and process the file
    const filePath = path.join(process.cwd(), '..', 'cline_docs', filename);
    let content = fs.readFileSync(filePath, 'utf8');

    // Find the section
    const sectionRegex = new RegExp(`## ${section}[\\s\\S]*?(?=\\n## |$)`);
    const sectionMatch = content.match(sectionRegex);

    if (!sectionMatch) {
        console.error(`Section "${section}" not found`);
        process.exit(1);
    }

    // Get the section content and process entries
    let sectionContent = sectionMatch[0];
    const entries = processSection(sectionContent);

    if (entryNum > entries.length) {
        console.error(`Entry number ${entryNum} not found. Section has ${entries.length} entries.`);
        process.exit(1);
    }

    // Remove the specified entry and renumber remaining entries
    entries.splice(entryNum - 1, 1);
    const updatedEntries = entries.map((entry, index) => {
        return entry.replace(/^\d+/, index + 1);
    });

    // Combine everything back
    const beforeSection = content.substring(0, sectionMatch.index);
    const afterSection = content.substring(sectionMatch.index + sectionMatch[0].length);

    // Reconstruct the section
    const newSectionContent = [
        `## ${section}`,
        '',
        ...updatedEntries
    ].join('\n');

    // Update the file
    const newContent = beforeSection + newSectionContent + afterSection;
    fs.writeFileSync(filePath, newContent);

    console.log(`Successfully deleted entry ${entryNum} and renumbered remaining entries`);
}

// Execute the appropriate command
if (command === 'add') {
    addEntry(filename, section, args);
} else if (command === 'delete') {
    const entryNumber = args[0];
    deleteEntry(filename, section, entryNumber);
}
