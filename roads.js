// roads.js
import { hexWidth, hexHeight } from './config.js';
import { getContext } from './canvas.js';
import { getNeighbors, hexDistance, lerp, getHexCenter, getHexCoordsFromPixel } from './utils.js';
import { 
  roadCurvatureInput, 
  roadCurveSegmentsInput, 
  roadCountInput, 
  roadDashLengthInput, 
  roadDashGapInput 
} from './controls.js';
import { addSubHexPoints as addSubHexPointsCommon } from './rivers.js'; // reuse the subdivision function

/**
 * Offsets an entire path of points uniformly by a given pixel amount.
 * The offset is computed perpendicular to the overall direction from the first to last point.
 */
function offsetPath(points, offset) {
  if (points.length < 2) return points;
  const start = points[0];
  const end = points[points.length - 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Compute unit perpendicular vector.
  const px = -dy / len;
  const py = dx / len;
  return points.map(p => ({
    x: p.x + offset * px,
    y: p.y + offset * py
  }));
}

/**
 * Draws a road on the canvas as a smooth, dashed line.
 * Uses the dash length and dash gap settings from the controls.
 */
export function drawRoad(points, baseWidth, roadColor) {
  if (points.length < 2) return;
  const ctx = getContext();
  ctx.save();
  ctx.strokeStyle = roadColor;
  ctx.lineWidth = baseWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Use dash settings from controls, with defaults if not set.
  const dashLength = parseInt(roadDashLengthInput.value, 10) || 9;
  const dashGap = parseInt(roadDashGapInput.value, 10) || 50;
  ctx.setLineDash([dashLength, dashGap]);

  const path = new Path2D();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cp = { x: (prev.x + curr.x) / 2, y: (prev.y + curr.y) / 2 };
    path.quadraticCurveTo(cp.x, cp.y, curr.x, curr.y);
  }
  ctx.stroke(path);
  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Generates a road network connecting all settlements.
 * The process is done in two phases:
 *   1. MST Phase: Build a minimum spanning tree (MST) that connects all settlements.
 *   2. Extra Roads Phase: Add additional connections if the desired road count is higher.
 * Each road path is then converted into a smooth, curved point path and offset slightly.
 * Returns an array of road point paths.
 */
export function generateRoadNetwork(settlements, mapWidth, mapHeight, rand, terrainMap, rivers) {
  const roadNetwork = [];
  if (settlements.length < 2) return roadNetwork;

  // --- MST PHASE ---
  const connected = [settlements[0]];
  const unconnected = settlements.slice(1);
  const globalRoadHexes = new Set(); // Helps avoid excessive overlaps (optional)
  const mstMaxAttempts = settlements.length * 20;
  let mstAttempts = 0;

  while (unconnected.length > 0 && mstAttempts < mstMaxAttempts) {
    mstAttempts++;
    let bestPair = null;
    let bestDistance = Infinity;
    // Find the smallest distance between any connected and unconnected settlement.
    for (const c of connected) {
      for (const u of unconnected) {
        const d = hexDistance(c.q, c.r, u.q, u.r);
        if (d < bestDistance) {
          bestDistance = d;
          bestPair = { start: c, target: u };
        }
      }
    }
    if (!bestPair) break;

    const roadPath = generateRoadPathHexesForNetwork(
      bestPair.start,
      bestPair.target,
      mapWidth,
      mapHeight,
      rand,
      terrainMap,
      globalRoadHexes
    );
    if (roadPath) {
      roadNetwork.push(roadPath);
      roadPath.forEach(hex => globalRoadHexes.add(`${hex.q},${hex.r}`));
      unconnected.splice(unconnected.indexOf(bestPair.target), 1);
      connected.push(bestPair.target);
    }
    // If no valid path is found, continue trying.
  }
  if (unconnected.length > 0) {
    console.warn("Not all settlements could be connected in the MST phase.");
  }

  // --- EXTRA ROADS PHASE ---
  const desiredRoadCount = parseInt(roadCountInput.value);
  const mstCount = settlements.length - 1;
  const extraRoadsNeeded = Math.max(0, desiredRoadCount - mstCount);
  const extraAttempts = settlements.length * 10;
  let extraTry = 0;
  while (extraRoadsNeeded > 0 && extraTry < extraAttempts) {
    extraTry++;
    // Randomly pick two different settlements.
    const a = settlements[Math.floor(rand() * settlements.length)];
    const b = settlements[Math.floor(rand() * settlements.length)];
    if (a === b) continue;
    const extraRoad = generateRoadPathHexesForNetwork(
      a,
      b,
      mapWidth,
      mapHeight,
      rand,
      terrainMap,
      globalRoadHexes
    );
    if (extraRoad) {
      roadNetwork.push(extraRoad);
      extraRoad.forEach(hex => globalRoadHexes.add(`${hex.q},${hex.r}`));
    }
  }

  // --- SMOOTHING & OFFSET ---
  // Convert each road's hex path into a smooth curved point path.
  const curvedRoadNetwork = roadNetwork.map(pathHexes =>
    // Pass road curvature and curve segments inputs so the curve reflects your settings.
    addSubHexPointsCommon(pathHexes, rand, roadCurvatureInput, roadCurveSegmentsInput)
  );
  // Apply a slight random perpendicular offset to each road.
  const offsetCurvedRoadNetwork = curvedRoadNetwork.map(road => {
    // Random offset in pixels (for example, between -10 and 10).
    const offset = (rand() - 0.5) * 20;
    return offsetPath(road, offset);
  });
  return offsetCurvedRoadNetwork;
}

/**
 * Generates a road path (array of hex coordinates) between two settlements.
 * Uses weighted randomness (favoring favorable terrain and closeness to the target)
 * to choose each step. Returns null if no valid path is found within maximum allowed steps.
 */
export function generateRoadPathHexesForNetwork(start, end, mapWidth, mapHeight, rand, terrainMap, globalRoadHexes) {
  const path = [];
  let current = { q: start.q, r: start.r };
  path.push(current);
  let steps = 0;
  const visited = new Set([`${current.q},${current.r}`]);
  // Increase maximum steps and length to give the algorithm more room.
  const maxSteps = 800;
  const maxLength = 400;

  while (steps < maxSteps && steps < maxLength) {
    if (hexDistance(current.q, current.r, end.q, end.r) < 2) {
      path.push(end);
      break;
    }

    let neighbors = getNeighbors(current.q, current.r, mapWidth, mapHeight)
      .map(([q, r]) => ({ q, r }))
      .filter(n => !visited.has(`${n.q},${n.r}`));
    // Roads cannot cross water.
    neighbors = neighbors.filter(n => terrainMap[n.r][n.q] !== 'water');
    if (neighbors.length === 0) break;

    // Compute weights based on terrain type and closeness to target.
    const weighted = neighbors.map(n => {
      let weight = 1;
      const terrain = terrainMap[n.r][n.q];
      if (terrain === 'plains') weight = 2;
      else if (terrain === 'forest') weight = 1.5;
      else if (terrain === 'mountain') weight = 0.1;
      const dTarget = hexDistance(n.q, n.r, end.q, end.r);
      const dTotal = hexDistance(start.q, start.r, end.q, end.r);
      const distanceBias = 1 - (dTarget / dTotal);
      weight *= (1 + distanceBias);
      return { pos: n, weight };
    });
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    let rnd = rand() * totalWeight;
    let next = weighted[0].pos;
    for (const item of weighted) {
      rnd -= item.weight;
      if (rnd <= 0) {
        next = item.pos;
        break;
      }
    }

    // Allow overlapping: do not reject a hex even if already used.
    path.push(next);
    visited.add(`${next.q},${next.r}`);
    if (globalRoadHexes) {
      globalRoadHexes.add(`${next.q},${next.r}`);
    }
    current = next;
    steps++;
  }

  if (steps >= maxSteps) {
    console.warn("Road path generation reached maximum steps.");
    return null;
  }
  return path;
}
