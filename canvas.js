// canvas.js
import { hexWidth, hexHeight, horizontalSpacing, verticalSpacing, terrainImages } from './config.js';

let canvas = null; // Initialize as null
let ctx = null;    // Initialize as null

export function initializeCanvas() { // New function to initialize
    canvas = document.getElementById('mapCanvas');
    ctx = canvas.getContext('2d');
}

export function getCanvas(){
    return canvas;
}

export function getContext(){
    return ctx;
}

// Function to draw a single hex tile
export function drawHexTile(q, r, terrain, scaleFactor) {
    const x = horizontalSpacing * q;
    const y = verticalSpacing * r + (q % 2) * (verticalSpacing / 2);

    const images = terrainImages[terrain];
    if (!images || images.length === 0) {
        console.error(`No images available for terrain type: ${terrain}`);
        return;
    }

    const img = images[Math.floor(Math.random() * images.length)];

    if (img.complete && img.naturalWidth !== 0) {
        const scaledWidth = hexWidth * scaleFactor;
        const scaledHeight = hexHeight * scaleFactor;

        // Center the scaled image
        const offsetX = (scaledWidth - hexWidth) / -2;
        const offsetY = (scaledHeight - hexHeight) / -2;

        ctx.drawImage(
            img,
            x + offsetX,
            y + offsetY,
            scaledWidth,
            scaledHeight
        );
    } else {
        console.error(`Image not ready or failed to load: ${img.src}`);
        ctx.fillStyle = '#f0f0f0';
        drawHexagon(ctx, x + hexWidth / 2, y + hexHeight / 2);
    }
}

// Function to draw a hexagon (optional, for placeholder)

function drawHexagon(ctx, x, y, size) { // Modified drawHexagon to accept size parameter
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i);
        const xi = x + size *  Math.cos(angle);
        const yi = y + size * Math.sin(angle);
        if (i === 0) {
            ctx.moveTo(xi, yi);
        } else {
            ctx.lineTo(xi, yi);
        }
    }
    ctx.closePath();
    ctx.strokeStyle = '#ccc';
    ctx.stroke();
}

export function resizeCanvas(gridWidthInput, gridHeightInput) {
    const canvas = document.getElementById('mapCanvas');
    const containerWidth = canvas.parentElement.offsetWidth; // Get the container width

    // Calculate the canvas internal dimensions based on the grid size
    canvas.width = gridWidthInput * 40; // Logical width
    canvas.height = gridHeightInput * 40; // Logical height

    // Adjust the CSS width to fit the container, keeping the aspect ratio
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${(canvas.height / canvas.width) * containerWidth}px` ;
}