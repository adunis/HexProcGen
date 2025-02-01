// main.js
import {
    getCanvas,
    getContext,
    drawHexTile,
    initializeCanvas
  } from './canvas.js';
  
  import {
    sliders,
    riverCountInput,
    riverWidthInput,
    riverColorInput,
    riverCurvatureInput,
    riverCurveSegmentsInput,
    riverMinLengthInput,
    riverMaxLengthInput,
    roadCountInput,
    roadWidthInput,
    roadColorInput,
    scaleFactorInput
  } from './controls.js';
  
  import {
    hexHeight,
    hexWidth
  } from './config.js';
  
  import {
    adjustSliders,
    updatePercentageDisplay,
    generateTerrainMap,
    generateMountainRange,
    generateWheatFieldsAroundSettlements
  } from './terrain.js';
  
  import {
    initLabelSettings,
    getLabelConfig,
    drawLabel,
    getKeywords
  } from './labels.js';
  
  import {
    generateRiverPathHexesForMapGen,
    drawRiver,
    findNearestWater,
    addSubHexPoints as addSubHexPointsRiver
  } from './rivers.js';
  
  import {
    drawRoad,
    generateRoadNetwork
  } from './roads.js';
  
  import {
    mulberry32,
    getHexCenter,
    getHexCoordsFromPixel
  } from './utils.js';
  
  let canvas = null;
  let ctx = null;
  
  // Initialize canvas and controls once the DOM is ready.
  document.addEventListener('DOMContentLoaded', () => {
    initializeCanvas();
    canvas = getCanvas();
    ctx = getContext();
  
    initLabelSettings();
    adjustSliders(Object.keys(sliders)[0]);
    updatePercentageDisplay();
  });
  
  /**
   * Generates the map with terrain, rivers, roads, and labels.
   * Now the terrain generation uses all terrain sliders (including for the new types)
   * and their corresponding clustering sliders.
   */
  export function generateMap(mapWidth, mapHeight, seed) {
    // Reset and clear canvas
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Get scale factor and compute scaled hex dimensions and spacing.
    const scaleFactor = parseFloat(scaleFactorInput.value);
    const scaledHexWidth = hexWidth * scaleFactor;
    const scaledHexHeight = hexHeight * scaleFactor;
    const scaledHorizontalSpacing = scaledHexWidth * 0.75;
    const scaledVerticalSpacing = scaledHexHeight * 0.866;
  
    // Set canvas dimensions
    canvas.width = scaledHorizontalSpacing * (mapWidth - 1) + scaledHexWidth;
    canvas.height = scaledVerticalSpacing * (mapHeight - 1) + scaledHexHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Initialize random generator with seed.
    const rand = mulberry32(seed);
  
    // Generate terrain map using the new slider values.
    // (The updated generateTerrainMap function in terrain.js now reads sliders
    // for water, wetland, plains, forest, mountain, urban, ruins, snow, snowmountain,
    // dune, hills, snowhills, volcano, badvolcano, snowvolcano, and badmountain.)
    const terrainMap = generateTerrainMap(mapWidth, mapHeight, seed);
  
    // Generate mountain ranges.
    const mountainRanges = Math.floor(rand() * 2) + 1;
    for (let i = 0; i < mountainRanges; i++) {
      const start = {
        q: Math.floor(rand() * mapWidth),
        r: Math.floor(rand() * mapHeight)
      };
      generateMountainRange(start, mapWidth, mapHeight, terrainMap, rand);
    }
  
    // Collect coordinates for key terrains.
    const mountains = [];
    const waters = [];
    const settlements = [];
    for (let r = 0; r < mapHeight; r++) {
      for (let q = 0; q < mapWidth; q++) {
        const terrain = terrainMap[r][q];
        if (terrain === 'mountain') {
          mountains.push({ q, r });
        } else if (terrain === 'water') {
          waters.push({ q, r });
        } else if (terrain === 'urban') {
          settlements.push({ q, r });
        }
      }
    }
  
    // Draw terrain hex tiles.
    for (let r = 0; r < mapHeight; r++) {
      for (let q = 0; q < mapWidth; q++) {
        drawHexTile(q, r, terrainMap[r][q], scaleFactor, mapWidth, mapHeight);
      }
    }
  
    // Generate wheat fields around settlements.
    generateWheatFieldsAroundSettlements(terrainMap, settlements, mapWidth, mapHeight, rand);
  
    // --- RIVER GENERATION ---
    const riverCount = parseInt(riverCountInput.value);
    const riverWidth = parseInt(riverWidthInput.value);
    const riverColor = riverColorInput.value;
    const riverMinLength = parseInt(riverMinLengthInput.value);
    const riverMaxLength = parseInt(riverMaxLengthInput.value);
  
    const rivers = [];
    const allRiverHexes = new Set();
  
    console.log("Mountains:", mountains);
    console.log("Waters:", waters);
  
    for (let i = 0; i < riverCount; i++) {
      if (mountains.length === 0 || waters.length === 0) break;
      const mountainIndex = Math.floor(rand() * mountains.length);
      const mountain = mountains.splice(mountainIndex, 1)[0];
      const water = findNearestWater(mountain, waters, mapWidth, mapHeight);
  
      const riverPathHexes = generateRiverPathHexesForMapGen(
        mountain,
        water,
        mapWidth,
        mapHeight,
        rand,
        terrainMap,
        riverMinLength,
        riverMaxLength,
        rivers
      );
      if (riverPathHexes) {
        rivers.push(riverPathHexes);
        riverPathHexes.forEach(hex => {
          allRiverHexes.add(`${hex.q},${hex.r}`);
        });
  
        // Generate detailed river path.
        const riverPathPoints = addSubHexPointsRiver(
          riverPathHexes,
          rand,
          riverCurvatureInput,
          riverCurveSegmentsInput,
          scaleFactor
        );
  
        // Set last hex to wetland if not water.
        const lastPoint = riverPathPoints[riverPathPoints.length - 1];
        if (lastPoint) {
          const hexCoords = getHexCoordsFromPixel(lastPoint.x, lastPoint.y);
          if (terrainMap[hexCoords.r] && terrainMap[hexCoords.r][hexCoords.q] && terrainMap[hexCoords.r][hexCoords.q] !== 'water') {
            terrainMap[hexCoords.r][hexCoords.q] = 'wetland';
          }
        }
      }
    }
  
    // --- ROAD GENERATION ---
    const roadCount = parseInt(roadCountInput.value);
    const roadWidth = parseInt(roadWidthInput.value);
    const roadColor = roadColorInput.value;
    const roads = generateRoadNetwork(settlements, mapWidth, mapHeight, rand, terrainMap, rivers);
    const allRoadHexes = new Set();
    roads.forEach(roadPath => {
      roadPath.forEach(point => {
        const hexCoords = getHexCoordsFromPixel(point.x, point.y);
        if (hexCoords && terrainMap[hexCoords.r] && terrainMap[hexCoords.r][hexCoords.q]) {
          allRoadHexes.add(`${hexCoords.q},${hexCoords.r}`);
        }
      });
    });
    roads.forEach(roadPath => {
      drawRoad(roadPath, roadWidth, roadColor);
    });
  
    console.log("RIVERS", rivers);
  
    // --- DRAW RIVERS ---
    rivers.forEach(riverPath => {
      const riverPathPoints = addSubHexPointsRiver(
        riverPath,
        rand,
        riverCurvatureInput,
        riverCurveSegmentsInput,
        scaleFactor
      );
      drawRiver(riverPathPoints, riverWidth * scaleFactor, riverColor);
    });
  
    // --- LABELS ---
    const labelConfig = getLabelConfig();
    for (let r = 0; r < mapHeight; r++) {
      for (let q = 0; q < mapWidth; q++) {
        const terrain = terrainMap[r][q];
        const config = labelConfig[terrain];
        if (config && config.names.length > 0 && rand() * 100 <= config.chance) {
          const center = getHexCenter(q, r);
          const name = config.names[Math.floor(rand() * config.names.length)];
          const keywordCount = Math.floor(Math.pow(rand(), 2) * 4) + 1;
          const keywords = getKeywords(config, keywordCount);
          ctx.save();
          drawLabel(center, name, keywords, config);
          ctx.restore();
        }
      }
    }
  }
  