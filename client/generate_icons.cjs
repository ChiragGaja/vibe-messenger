const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const sizes = [192, 512];
const outDir = path.join(__dirname, 'public');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

async function createIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#6366f1'; // primary-500
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.2); // rounded square
    ctx.fill();

    // Text (C for Chatter)
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.6}px 'Poppins', Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('C', size / 2, size / 2 + size * 0.05); // slight visual offset

    const buffer = canvas.toBuffer('image/png');
    const outPath = path.join(outDir, `pwa-${size}x${size}.png`);
    fs.writeFileSync(outPath, buffer);
    console.log(`Generated ${outPath}`);
}

async function main() {
    for (const size of sizes) {
        await createIcon(size);
    }
}

main().catch(console.error);
