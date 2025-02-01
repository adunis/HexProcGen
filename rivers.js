// rivers.js
import { hexWidth, hexHeight } from './config.js';
import { getContext } from './canvas.js';
import { getNeighbors, hexDistance, lerp, mulberry32, getHexCenter, getHexCoordsFromPixel } from './utils.js';
import { riverCurvatureInput, riverCurveSegmentsInput } from './controls.js';

/**
 * Generates a detailed river path between a start and an end hex.
 * Uses weighted randomness and a meandering bias to choose the next hex.
 */
export function generateRiverPathHexes(start, end, width, height, rand, terrainMap, minLength, maxLength, rivers) {
  const path = [];
  let current = { q: start.q, r: start.r };
  path.push(current);
  let steps = 1;
  const visited = new Set([`${current.q},${current.r}`]);
  let lastPositions = [];
  const maxHistory = 3;

  while (steps < maxLength) {
    // Stop if we've reached a water tile and met the minimum length
    if (steps >= minLength && terrainMap[current.r][current.q] === 'water') break;

    // Get available neighboring hexes
    let neighbors = getNeighbors(current.q, current.r, width, height)
      .map(([q, r]) => ({ q, r }))
      .filter(n => !visited.has(`${n.q},${n.r}`));

    // If still building the river, avoid water
    if (steps < minLength) {
      neighbors = neighbors.filter(n => terrainMap[n.r][n.q] !== 'water');
    }

    // If past minLength and a neighbor is water, choose it immediately
    if (steps >= minLength) {
      const waterNeighbors = neighbors.filter(n => terrainMap[n.r][n.q] === 'water');
      if (waterNeighbors.length > 0) {
        path.push(waterNeighbors[0]);
        break;
      }
    }

    if (neighbors.length === 0) break;

    // Compute a meandering bias based on the recent direction history
    const directionBias = calculateMeanderBias(lastPositions);

    // Prefer neighbors that move closer to the target end hex
    const candidates = neighbors.filter(n =>
      hexDistance(n.q, n.r, end.q, end.r) < hexDistance(current.q, current.r, end.q, end.r)
    );
    const availableNeighbors = candidates.length > 0 ? candidates : neighbors;

    // Weight each candidate by 1 + the absolute dot product between the bias and the direction vector.
    const weightedNeighbors = availableNeighbors.map(n => {
      const dir = getDirectionVector(current, n);
      const dot = directionBias.x * dir.x + directionBias.y * dir.y;
      return { pos: n, weight: 1 + Math.abs(dot) };
    });

    // Select next hex via weighted randomness
    const totalWeight = weightedNeighbors.reduce((sum, n) => sum + n.weight, 0);
    let randomValue = rand() * totalWeight;
    let next = weightedNeighbors[0].pos;
    for (const n of weightedNeighbors) {
      randomValue -= n.weight;
      if (randomValue <= 0) {
        next = n.pos;
        break;
      }
    }

    // Update history for meandering effect
    lastPositions.push(getDirectionVector(current, next));
    if (lastPositions.length > maxHistory) lastPositions.shift();

    path.push(next);
    visited.add(`${next.q},${next.r}`);
    current = next;
    steps++;
  }

  // Return the detailed path (with additional intermediate points)
  return addSubHexPoints(path, rand, riverCurvatureInput, riverCurveSegmentsInput);
}

/**
 * Generates intermediate points between each hex center along a hex path.
 * This smooths the river by adding a slight curvature.
 */
export function addSubHexPoints(hexPath, rand, curvatureInput, segmentsInput, scaleFactor = 1) {
  const detailedPath = [];
  const curvature = parseInt(curvatureInput.value, 10);
  const numSegments = parseInt(segmentsInput.value, 10);
  const maxOffset = curvature; // Use curvature as the maximum offset

  // Loop through each segment between hex centers.
  for (let i = 0; i < hexPath.length - 1; i++) {
    const start = getHexCenter(hexPath[i].q, hexPath[i].r);
    const end = getHexCenter(hexPath[i + 1].q, hexPath[i + 1].r);

    for (let j = 0; j <= numSegments; j++) {
      const t = j / numSegments;
      let x = lerp(start.x, end.x, t);
      let y = lerp(start.y, end.y, t);

      // Add a perpendicular offset for midpoints (skip endpoints)
      if (j > 0 && j < numSegments) {
        const offsetFactor = Math.sin(t * Math.PI);
        const offset = (rand() - 0.5) * maxOffset * offsetFactor;
        const angle = Math.atan2(end.y - start.y, end.x - start.x) + Math.PI / 2;
        x += Math.cos(angle) * offset;
        y += Math.sin(angle) * offset;
      }
      detailedPath.push({ x, y });
    }
  }
  return detailedPath;
}

/**
 * Draws the river on the canvas.
 */
export function drawRiver(points, width, color) {
  const ctx = getContext();
  ctx.save();
  // Reset any transforms and enable smoothing
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;

  const path = new Path2D();
  path.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(point => path.lineTo(point.x, point.y));

  ctx.strokeStyle = color;
  ctx.lineWidth = width * 1.5;
  ctx.lineCap = 'round';
  //ctx.globalCompositeOperation = 'multiply';
  ctx.stroke(path);
  ctx.restore();
}

/**
 * Returns the meander bias as a perpendicular vector
 * based on recent movement directions.
 */
function calculateMeanderBias(history) {
  const bias = { x: 0, y: 0 };
  for (const dir of history) {
    bias.x += dir.x;
    bias.y += dir.y;
  }
  // Return the perpendicular vector for a meandering effect.
  return { x: -bias.y, y: bias.x };
}

/**
 * Computes a simple directional vector from one hex to another.
 */
function getDirectionVector(from, to) {
  return {
    x: to.q - from.q,
    y: to.r - from.r
  };
}

/**
 * Finds the nearest water hex from a starting hex.
 */
export function findNearestWater(start, waters, width, height) {
  let nearest = waters[0];
  let minDistance = Infinity;
  for (const water of waters) {
    const dist = hexDistance(start.q, start.r, water.q, water.r);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = water;
    }
  }
  return nearest;
}

/**
 * Generates a river path for map generation that avoids collisions
 * with previously generated river hexes.
 * (This function returns the hex path without subdivision.)
 */
export function generateRiverPathHexesForMapGen(start, end, width, height, rand, terrainMap, minLength, maxLength, rivers) {
  const path = [];
  let current = { q: start.q, r: start.r };
  path.push(current);
  let steps = 1;
  const visited = new Set([`${current.q},${current.r}`]);
  const riverHexes = new Set();

  // Seed the set with hexes from already generated rivers.
  rivers.forEach(riverPath => {
    riverPath.forEach(hex => riverHexes.add(`${hex.q},${hex.r}`));
  });

  while (steps < maxLength) {
    if (steps >= minLength && terrainMap[current.r][current.q] === 'water') break;

    let neighbors = getNeighbors(current.q, current.r, width, height)
      .map(([q, r]) => ({ q, r }))
      .filter(n => !visited.has(`${n.q},${n.r}`));

    if (steps < minLength) {
      neighbors = neighbors.filter(n => terrainMap[n.r][n.q] !== 'water');
    }

    if (steps >= minLength) {
      const waterNeighbors = neighbors.filter(n => terrainMap[n.r][n.q] === 'water');
      if (waterNeighbors.length > 0) {
        path.push(waterNeighbors[0]);
        break;
      }
    }

    if (neighbors.length === 0) break;

    const weightedNeighbors = neighbors.map(n => {
      let weight = 1;
      if (terrainMap[n.r][n.q] === 'plains') {
        weight = 3;
      } else if (terrainMap[n.r][n.q] !== 'water') {
        weight = 1.5;
      }
      // Bias toward the end by considering relative distances.
      const distanceWeight = Math.max(
        0.1,
        1 - (hexDistance(n.q, n.r, end.q, end.r) / hexDistance(start.q, start.r, end.q, end.r))
      );
      return { pos: n, weight: weight * (1 + distanceWeight) };
    });

    const totalWeight = weightedNeighbors.reduce((sum, n) => sum + n.weight, 0);
    let randomValue = rand() * totalWeight;
    let next = weightedNeighbors[0].pos;
    for (const n of weightedNeighbors) {
      randomValue -= n.weight;
      if (randomValue <= 0) {
        next = n.pos;
        break;
      }
    }

    // Prevent collision with other rivers.
    if (riverHexes.has(`${next.q},${next.r}`)) return null;

    path.push(next);
    visited.add(`${next.q},${next.r}`);
    riverHexes.add(`${next.q},${next.r}`);
    current = next;
    steps++;
  }

  if (path.length < 2) return null;
  return path;
}
