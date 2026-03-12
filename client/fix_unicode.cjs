const fs = require('fs');
const p = 'c:/Users/Lenovo/.gemini/antigravity/scratch/chat app/client/src/components/Sidebar.jsx';
let c = fs.readFileSync(p, 'utf8');

// Replace ANY hidden unicode character except standard newlines and spaces
c = c.replace(/[\u2018\u2019]/g, "'"); // smart single quotes
c = c.replace(/[\u201C\u201D]/g, '"'); // smart double quotes
c = c.replace(/[\u200B-\u200D\uFEFF]/g, ''); // zero width spaces
c = c.replace(/[\u00A0]/g, ' '); // non-breaking spaces

// Overwrite the specific Authorization line to be 100% sure it's ASCII
c = c.replace(/headers:\s*\{\s*Autho[^:]+:\s*`Bearer[^`]+`\s*\}/g, 'headers: { Authorization: `Bearer ${token}` }');

fs.writeFileSync(p, c, 'utf8');
console.log('Cleaned unicode artifacts.');
