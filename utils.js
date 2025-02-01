

// utils.js
import { hexWidth, hexHeight, horizontalSpacing, verticalSpacing } from './config.js';

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Helper function to lighten/darken colors
export function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return `#${(1 << 24 | (R < 255 ? R < 1 ? 0 : R : 255) << 16 |
            (G < 255 ? G < 1 ? 0 : G : 255) << 8 |
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)}`;
}

// Seeded random number generator (Mulberry32)
export function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

export function getHexCenter(q, r, scaleFactor = 1) {
    const scaledHexWidth = 466 * scaleFactor;
    const scaledHexHeight = 405 * scaleFactor;
    const hSpacing = scaledHexWidth * 0.75;
    const vSpacing = scaledHexHeight * 0.866;
    
    return {
        x: hSpacing * q + scaledHexWidth/2,
        y: vSpacing * r + (q % 2) * vSpacing/2 + scaledHexHeight/2
    };
}
export function getHexCoordsFromPixel(x, y) {
    const q = Math.round((x - hexWidth/2) / horizontalSpacing);
    const r = Math.round((y - hexHeight/2 - (q % 2) * (verticalSpacing / 2)) / verticalSpacing);
    return { q, r };
}

// Helper functions
export function hexDistance(q1, r1, q2, r2) {
    return (Math.abs(q1 - q2) +
            Math.abs(q1 + r1 - q2 - r2) +
            Math.abs(r1 - r2)) / 2;
}

// Function to get neighbors in a hex grid
export function getNeighbors(q, r, width, height) {
    const neighbors = [];
    const even = (q % 2) === 0;
    const directions = even ? [[+1, 0], [0, +1], [-1, 0], [-1, -1], [0, -1], [+1, -1]] :
                              [[+1, 0], [0, +1], [-1, +1], [-1, 0], [0, -1], [+1, +1]];
    for (let [dq, dr] of directions) {
        const nq = q + dq;
        const nr = r + dr;
        if (nq >= 0 && nq < width && nr >= 0 && nr < height) {
            neighbors.push([nq, nr]);
        }
    }
    return neighbors;
}

export function findEnclosedLakes(terrainMap, width, height) {
    const visited = new Set();
    const lakes = [];

    // Flood fill to find water regions
    for (let r = 0; r < height; r++) {
        for (let q = 0; q < width; q++) {
            if (terrainMap[r][q] === 'water' && !visited.has(`${q},${r}`)) {
                const { region, isEnclosed } = floodFillRegion(q, r, terrainMap, width, height, visited);
                if (isEnclosed) {
                    lakes.push(region);
                }
            }
        }
    }
    return lakes;
}

function floodFillRegion(q, r, terrainMap, width, height, visited) {
    const stack = [[q, r]];
    const region = [];
    let isEnclosed = true;
    visited.add(`${q},${r}`);

    while (stack.length > 0) {
        const [currentQ, currentR] = stack.pop();
        region.push({ q: currentQ, r: currentR });

        // Check neighbors
        getNeighbors(currentQ, currentR, width, height).forEach(([nq, nr]) => {
            const key = `${nq},${nr}`;
            if (terrainMap[nr][nq] !== 'water') isEnclosed = false;
            if (!visited.has(key) && terrainMap[nr][nq] === 'water') {
                visited.add(key);
                stack.push([nq, nr]);
            }
        });
    }

    return { region, isEnclosed };
}

export function findCoastalWaters(terrainMap, width, height) {
    const coastal = [];
    for (let r = 0; r < height; r++) {
        for (let q = 0; q < width; q++) {
            if (terrainMap[r][q] === 'water') {
                const neighbors = getNeighbors(q, r, width, height);
                if (neighbors.some(([nq, nr]) => terrainMap[nr][nq] !== 'water')) {
                    coastal.push({ q, r });
                }
            }
        }
    }
    return coastal;
}