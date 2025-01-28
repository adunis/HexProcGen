// script.js
// Canvas and context
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// Controls
const gridWidthInput = document.getElementById('gridWidth');
const gridHeightInput = document.getElementById('gridHeight');
const generateButton = document.getElementById('generateButton');

// Constants
const hexWidth = 466; // Width of each hexagon image in pixels
const hexHeight = 405; // Height of each hexagon image in pixels
const horizontalSpacing = hexWidth * 0.75; // Adjusted to 75% of hexWidth for proper spacing
const verticalSpacing = hexHeight * 0.866; // sin(60°) ≈ 0.866
const terrainTypes = ['water', 'wetland', 'plains', 'forest', 'mountain', 'urban', 'ruins']; // Terrain types matching your assets
const terrainImages = {};

// References to sliders and percentages
const sliders = {
    water: document.getElementById('waterSlider'),
    wetland: document.getElementById('wetlandSlider'),
    plains: document.getElementById('plainsSlider'),
    forest: document.getElementById('forestSlider'),
    mountain: document.getElementById('mountainSlider'),
    urban: document.getElementById('urbanSlider'),
    ruins: document.getElementById('ruinsSlider')
};

const percentages = {
    water: document.getElementById('waterPercent'),
    wetland: document.getElementById('wetlandPercent'),
    plains: document.getElementById('plainsPercent'),
    forest: document.getElementById('forestPercent'),
    mountain: document.getElementById('mountainPercent'),
    urban: document.getElementById('urbanPercent'),
    ruins: document.getElementById('ruinsPercent')
};

const clusteringSliders = {
    water: document.getElementById('waterClustering'),
    wetland: document.getElementById('wetlandClustering'),
    plains: document.getElementById('plainsClustering'),
    forest: document.getElementById('forestClustering'),
    mountain: document.getElementById('mountainClustering'),
    urban: document.getElementById('urbanClustering'),
    ruins: document.getElementById('ruinsClustering')
};

const clusteringValues = {
    water: document.getElementById('waterClusteringValue'),
    wetland: document.getElementById('wetlandClusteringValue'),
    plains: document.getElementById('plainsClusteringValue'),
    forest: document.getElementById('forestClusteringValue'),
    mountain: document.getElementById('mountainClusteringValue'),
    urban: document.getElementById('urbanClusteringValue'),
    ruins: document.getElementById('ruinsClusteringValue')
};

// River properties inputs
const riverCountInput = document.getElementById('riverCount');
const riverWidthInput = document.getElementById('riverWidth');
const riverColorInput = document.getElementById('riverColor');
const riverCurvatureInput = document.getElementById('riverCurvature');
const riverCurveSegmentsInput = document.getElementById('riverCurveSegments');


// Attach event listeners to sliders
for (let key in sliders) {
    sliders[key].addEventListener('input', () => {
        adjustSliders(key); // Adjust other sliders
        updatePercentageDisplay(); // Update the display
    });
}

// Add this after existing slider event listeners
for (let key in clusteringSliders) {
    clusteringSliders[key].addEventListener('input', () => {
        clusteringValues[key].textContent = clusteringSliders[key].value;
    });
}

function adjustSliders(changedKey) {
    const changedValue = parseInt(sliders[changedKey].value, 10); // Value of the changed slider
    let total = 0;

    // Sum the values of all sliders except the changed one
    for (let key in sliders) {
        if (key !== changedKey) {
            total += parseInt(sliders[key].value, 10);
        }
    }

    // Calculate remaining percentage for the other sliders
    const remaining = 100 - changedValue;

    // Adjust other sliders proportionally
    const keysToAdjust = Object.keys(sliders).filter(key => key !== changedKey);
    let redistributedValues = [];
    if (total > 0) {
        keysToAdjust.forEach((key) => {
            const currentValue = parseInt(sliders[key].value, 10);
            const proportion = currentValue / total; // Proportion of the current slider
            redistributedValues.push(Math.round(proportion * remaining)); // Redistribute value
        });
    } else {
        // If total is 0 (all other sliders are 0), distribute equally
        const equalValue = Math.floor(remaining / keysToAdjust.length);
        redistributedValues = keysToAdjust.map((_, index) =>
            index === keysToAdjust.length - 1
                ? remaining - equalValue * (keysToAdjust.length - 1) // Assign leftover to the last slider
                : equalValue
        );
    }

    // Apply redistributed values
    keysToAdjust.forEach((key, index) => {
        sliders[key].value = redistributedValues[index];
    });

    // Ensure total equals 100% by adjusting the highest slider if needed
    let actualTotal = changedValue + redistributedValues.reduce((sum, val) => sum + val, 0);
    let roundingError = 100 - actualTotal;

    if (roundingError !== 0) {
        // Find the slider with the highest value
        const maxKey = Object.keys(sliders).reduce((max, key) =>
            parseInt(sliders[key].value, 10) > parseInt(sliders[max].value, 10) ? key : max,
            Object.keys(sliders)[0]
        );
        sliders[maxKey].value = parseInt(sliders[maxKey].value, 10) + roundingError;
    }

    updatePercentageDisplay(); // Update displayed percentages
}




// Update displayed percentages
function updatePercentageDisplay() {
    for (let key in sliders) {
        percentages[key].textContent = sliders[key].value + '%';
    }
}

// Presets
const presets = {
    balanced: { water: 20, wetland: 10, plains: 30, forest: 25, mountain: 10, urban: 5, ruins:0},
    waterHeavy: { water: 50, wetland: 10, plains: 15, forest: 10, mountain: 10, urban: 5, ruins:0 },
    forestHeavy: { water: 10, wetland: 5, plains: 20, forest: 50, mountain: 10, urban: 5, ruins:0 },
    normalClustering: {
        water: 1.5,
        wetland: 0.3,
        plains: 0.3,
        forest: 0.3,
        mountain: 1.5,
        urban: 0.1,
        ruins: 0.1
    }
};


// Update applyPreset function
function applyPreset(preset) {
    const config = presets[preset];
    for (let key in config) {
        sliders[key].value = config[key];
    }
    for (let key in config.clustering) {
        clusteringSliders[key].value = config.clustering[key];
        clusteringValues[key].textContent = config.clustering[key];
    }
    updatePercentageDisplay();
}


// Apply preset
function applyPreset(preset) {
    const config = presets[preset];
    for (let key in config) {
        sliders[key].value = config[key];
    }
    updatePercentageDisplay();
}

// Attach event listeners to preset buttons
document.querySelectorAll('.presetButton').forEach(button => {
    button.addEventListener('click', () => applyPreset(button.dataset.preset));
});

// Generate Map Button Click Event
generateButton.addEventListener('click', () => {
    const width = parseInt(gridWidthInput.value);
    const height = parseInt(gridHeightInput.value);
    const seed = Date.now(); // Generate a new seed each time

    // Validate terrain percentages
    const totalPercent = Object.values(sliders).reduce((total, slider) => total + parseInt(slider.value), 0);
    if (totalPercent !== 100) {
        alert('The total of terrain percentages must equal 100%.');
        return;
    }

    loadImages(() => {
        generateMap(width, height, seed);
    });
});

// Load images function with callback
function loadImages(callback) {
    let imagesToLoad = 0;
    terrainTypes.forEach(type => {
        terrainImages[type] = [];
        const typeImages = getTypeImages(type);
        imagesToLoad += typeImages.length;
        typeImages.forEach(src => {
            const img = new Image();
            img.src = src;

            img.onload = () => {
                imagesToLoad--;
                if (imagesToLoad === 0) {
                    callback();
                }
            };

            img.onerror = () => {
                imagesToLoad--;
                if (imagesToLoad === 0) {
                    callback();
                }
            };

            terrainImages[type].push(img);
        });
    });
}

// Function to get image sources for each terrain type
function getTypeImages(type) {
    const images = [];
    switch (type) {
        case 'water':
            images.push('assets/water1.png');
            images.push('assets/water2.png');
            images.push('assets/water3.png');
            images.push('assets/water4.png');
            images.push('assets/water5.png');
            images.push('assets/water6.png');
            images.push('assets/water7.png');
            images.push('assets/water8.png');
            images.push('assets/water9.png');
            images.push('assets/water10.png');
            break;
        case 'wetland':
            images.push('assets/wetland1.png');
            images.push('assets/wetland2.png');
            images.push('assets/wetland3.png');
            images.push('assets/wetland4.png');
            break;
        case 'plains':
            images.push('assets/plains1.png');
            images.push('assets/plains2.png');
            images.push('assets/plains3.png');
            images.push('assets/plains4.png');
            images.push('assets/plains5.png');
            break;
        case 'forest':
            images.push('assets/forest1.png');
            images.push('assets/forest2.png');
            images.push('assets/forest3.png');
            images.push('assets/forest4.png');
            images.push('assets/forest7.png');
            break;
        case 'mountain':
            images.push('assets/mountain1.png');
            images.push('assets/mountain2.png');
            images.push('assets/mountain3.png');
            images.push('assets/mountain4.png');
            break;
        case 'urban':
            images.push('assets/urban1.png');
            images.push('assets/urban2.png');
            images.push('assets/urban3.png');
            images.push('assets/urban4.png');
            images.push('assets/urban5.png');
            images.push('assets/urban6.png');
            images.push('assets/urban7.png');
            images.push('assets/urban8.png');
            images.push('assets/urban10.png');
            break;
         case 'ruins':
            images.push('assets/ruins1.png');
            break;
        case 'wheatfield':
            images.push('assets/wheatfield1.png');
            images.push('assets/wheatfield2.png');
            images.push('assets/wheatfield3.png');
            break;
        default:
            break;
    }
    return images;
}

// River generation functions
// Modified river path generation with intermediate points
function generateRiverPathHexes(start, end, width, height, rand, terrainMap, minLength, maxLength) {
    const path = [];
    let current = { q: start.q, r: start.r };
    path.push(current);
    let steps = 1;
    let turns = 0;
    let previousDirection = null;
    const visited = new Set();
    visited.add(`${current.q},${current.r}`);

    // Track previous positions for meander calculation
    let lastPositions = [];
    const maxHistory = 3;

    while (steps < maxLength) {
        if (steps >= minLength && terrainMap[current.r][current.q] === 'water') {
            break;
        }

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

        // Calculate preferred direction with meandering
        let directionBias = calculateMeanderBias(lastPositions);
        const candidates = neighbors.filter(n =>
            hexDistance(n.q, n.r, end.q, end.r) < hexDistance(current.q, current.r, end.q, end.r)
        );

        const availableNeighbors = candidates.length > 0 ? candidates : neighbors;
        const weightedNeighbors = availableNeighbors.map(n => ({
            pos: n,
            weight: 1 + Math.abs(directionBias.dot(getDirectionVector(current, n)))
        }));

        // Select next position with weighted randomness
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

        // Update meander history
        lastPositions.push(getDirectionVector(current, next));
        if (lastPositions.length > maxHistory) lastPositions.shift();

        path.push(next);
        visited.add(`${next.q},${next.r}`);
        current = next;
        steps++;
    }

    // Add intermediate points between hex centers
    return addSubHexPoints(path, rand);
}

function addSubHexPoints(hexPath, rand) {
    const detailedPath = [];
    const curvature = parseInt(riverCurvatureInput.value);
    const numSegments = parseInt(riverCurveSegmentsInput.value);
    const maxOffset = curvature; // Adjust offset range as needed, curvature directly controls max offset

    for (let i = 0; i < hexPath.length - 1; i++) {
        const start = getHexCenter(hexPath[i].q, hexPath[i].r);
        const end = getHexCenter(hexPath[i + 1].q, hexPath[i + 1].r);

        for (let j = 0; j <= numSegments; j++) {
            const t = j / numSegments;
            let x = lerp(start.x, end.x, t);
            let y = lerp(start.y, end.y, t);

            // Apply perpendicular offset for curves, less offset at endpoints
            if (j > 0 && j < numSegments) {
                const offsetFactor = Math.sin(j / numSegments * Math.PI); // Sine wave for offset
                const offset = (rand() - 0.5) * maxOffset * offsetFactor;
                const angle = Math.atan2(end.y - start.y, end.x - start.x) + Math.PI / 2;
                x += Math.cos(angle) * offset;
                y += Math.sin(angle) * offset;
            }
            detailedPath.push({x, y});
        }
    }
    return detailedPath;
}

function drawRoad(points, baseWidth, roadColor) {
    if (points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = roadColor;
    ctx.lineWidth = baseWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Set line dash pattern for dotted line
    ctx.setLineDash([5, 30]); // Adjust these values to change the dot and gap size. [dashLength, gapLength]

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.stroke();

    // Reset line dash pattern to solid for other drawings (optional, but good practice)
    ctx.setLineDash([]);

    ctx.restore();
}


function drawRiver(points, baseWidth, riverColor) {
    if (points.length < 2) return;

    ctx.save();
    const gradient = ctx.createLinearGradient(
        points[0].x, points[0].y,
        points[points.length-1].x, points[points.length-1].y
    );
    gradient.addColorStop(0, riverColor);
    gradient.addColorStop(1, shadeColor(riverColor, -20));

    ctx.strokeStyle = gradient;
    ctx.fillStyle = gradient;

    // Create smooth path using Bezier curves
    const path = new Path2D();
    path.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
        const prev = points[i-1];
        const current = points[i];
        const controlPoint = {
            x: (prev.x + current.x) / 2,
            y: (prev.y + current.y) / 2
        };

        path.quadraticCurveTo(
            controlPoint.x, controlPoint.y,
            current.x, current.y
        );
    }

    // Create outline with varying width
    ctx.lineWidth = baseWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(path);

    ctx.restore();
}

// Helper functions
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function calculateMeanderBias(history) {
    // Calculate tendency to meander based on recent direction history
    const bias = { x: 0, y: 0 };
    for (const dir of history) {
        bias.x += dir.x;
        bias.y += dir.y;
    }
    // Return perpendicular vector to create meandering
    return { x: -bias.y, y: bias.x };
}

function getDirectionVector(from, to) {
    return {
        x: to.q - from.q,
        y: to.r - from.r
    };
}

// Helper function to lighten/darken colors
function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return `#${(1 << 24 | (R < 255 ? R < 1 ? 0 : R : 255) << 16 |
            (G < 255 ? G < 1 ? 0 : G : 255) << 8 |
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)}`;
}

function generateMap(mapWidth, mapHeight, seed) {
    const horizontalSpacing = hexWidth * 0.7;
    const verticalSpacing = hexHeight * 0.866;
    const riverMinLength = parseInt(document.getElementById('riverMinLength').value);
const riverMaxLength = parseInt(document.getElementById('riverMaxLength').value);

    canvas.width = horizontalSpacing * (mapWidth + 0.5);
    canvas.height = verticalSpacing * (mapHeight + 0.5);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rand = mulberry32(seed);

    const terrainPercentages = {
        water: parseInt(sliders.water.value) / 100,
        wetland: parseInt(sliders.wetland.value) / 100,
        plains: parseInt(sliders.plains.value) / 100,
        forest: parseInt(sliders.forest.value) / 100,
        mountain: parseInt(sliders.mountain.value) / 100,
        urban: parseInt(sliders.urban.value) / 100,
        ruins: parseInt(sliders.ruins.value) / 100,
    };

    const totalPercentage = Object.values(terrainPercentages).reduce((sum, val) => sum + val, 0);
    for (let key in terrainPercentages) {
        terrainPercentages[key] /= totalPercentage;
    }

    const terrainMap = [];
    for (let r = 0; r < mapHeight; r++) {
        terrainMap[r] = [];
        for (let q = 0; q < mapWidth; q++) {
            const neighbors = getNeighbors(q, r, mapWidth, mapHeight);
            const neighborCounts = {};

            neighbors.forEach(([nq, nr]) => {
                if (nr < r || (nr === r && nq < q)) {
                    const neighborTerrain = terrainMap[nr]?.[nq];
                    if (neighborTerrain) {
                        neighborCounts[neighborTerrain] = (neighborCounts[neighborTerrain] || 0) + 1;
                    }
                }
            });

            const adjustedWeights = {};
            for (const key in terrainPercentages) {
                const baseWeight = terrainPercentages[key];
                const influence = getInfluenceFactor(key);
                const count = neighborCounts[key] || 0;
                adjustedWeights[key] = baseWeight * (1 + influence * count);
            }

            let totalWeight = Object.values(adjustedWeights).reduce((a, b) => a + b, 0);
            if (totalWeight === 0) totalWeight = 1;

            const adjustedProbabilities = {};
            for (const key in adjustedWeights) {
                adjustedProbabilities[key] = adjustedWeights[key] / totalWeight;
            }

            const terrainCumulative = [];
            let cumulative = 0;
            Object.keys(adjustedProbabilities).forEach(key => {
                cumulative += adjustedProbabilities[key];
                terrainCumulative.push({ terrain: key, value: cumulative });
            });

            const randValue = rand();
            let terrain = 'plains';
            for (let i = 0; i < terrainCumulative.length; i++) {
                if (randValue <= terrainCumulative[i].value) {
                    terrain = terrainCumulative[i].terrain;
                    break;
                }
            }

            terrainMap[r][q] = terrain;
        }
    }

    const mountainRanges = Math.floor(rand() * 2) + 1;
    for (let i = 0; i < mountainRanges; i++) {
        const start = {
            q: Math.floor(rand() * mapWidth),
            r: Math.floor(rand() * mapHeight)
        };
        generateMountainRange(start, mapWidth, mapHeight, terrainMap, rand);
    }



    const mountains = [];
    const waters = [];

    const settlements = []; // Find settlements for roads
    for (let r = 0; r < mapHeight; r++) {
        for (let q = 0; q < mapWidth; q++) {
            if (terrainMap[r][q] === 'mountain') {
                mountains.push({ q, r });
            } else if (terrainMap[r][q] === 'water') {
                waters.push({ q, r });
            } else if (terrainMap[r][q] === 'urban' || terrainMap[r][q] === 'ruins') { //Identify settlements
                settlements.push({ q, r });
            }
        }
    }

    // Generate and draw rivers
    const riverCount = parseInt(riverCountInput.value);
    const riverWidth = parseInt(riverWidthInput.value);
    const riverColor = riverColorInput.value;
    const riverCurveSegments = parseInt(riverCurveSegmentsInput.value);
    const riverCurvature = parseInt(riverCurvatureInput.value);


// Road properties inputs
const roadCountInput = document.getElementById('roadCount');
const roadWidthInput = document.getElementById('roadWidth');
const roadColorInput = document.getElementById('roadColor');

    const rivers = []; // Array to store river paths
    const allRiverHexes = new Set(); // Set to store hexes of all rivers

    for (let i = 0; i < riverCount; i++) {
        if (mountains.length === 0 || waters.length === 0) break;

        const mountainIndex = Math.floor(rand() * mountains.length);
        const mountain = mountains.splice(mountainIndex, 1)[0];
        const water = findNearestWater(mountain, waters, mapWidth, mapHeight);

        const riverPathHexes = generateRiverPathHexes(
            mountain, water, mapWidth, mapHeight, rand, terrainMap,
            riverMinLength, riverMaxLength, rivers // Pass the rivers array for collision detection
        );

        if (riverPathHexes) { // Only proceed if river path is valid (not null due to collision)
            rivers.push(riverPathHexes);
            riverPathHexes.forEach(hex => {
                allRiverHexes.add(`${hex.q},${hex.r}`); // Add hexes to the global set of river hexes
            });


            const riverPathPoints = addSubHexPoints(riverPathHexes, rand);

            // Check and convert last hex to wetland if not water (moved after river path generation)
            const lastHex = riverPathPoints[riverPathPoints.length - 1];
            if (lastHex) {
                const hexCoords = getHexCoordsFromPixel(lastHex.x, lastHex.y);
                if (terrainMap[hexCoords.r] && terrainMap[hexCoords.r][hexCoords.q] && terrainMap[hexCoords.r][hexCoords.q] !== 'water') {
                    terrainMap[hexCoords.r][hexCoords.q] = 'wetland';
                }
            }
        }
    }

        // Generate Roads (modified)
        const roadCount = parseInt(roadCountInput.value);
        const roadWidth = parseInt(roadWidthInput.value);
        const roadColor = roadColorInput.value;
        const roads = generateRoadNetwork(settlements, mapWidth, mapHeight, rand, terrainMap, rivers); // Use network generator
        const allRoadHexes = new Set();
        roads.forEach(roadPath => {
            roadPath.forEach(hex => allRoadHexes.add(`${hex.q},${hex.r}`));
        });
        roads.forEach(roadPath => {
            const roadPathPoints = roadPath.map(hex => getHexCenter(hex.q, hex.r));
            drawRoad(roadPathPoints, roadWidth, roadColor);
        });


    for (let r = 0; r < mapHeight; r++) {
        for (let q = 0; q < mapWidth; q++) {
            drawHexTile(q, r, terrainMap[r][q]);
        }
    }

    // Draw rivers on top
    rivers.forEach(riverPath => {
        const riverPathPoints = addSubHexPoints(riverPath, rand); // Re-calculate points for drawing
        drawRiver(riverPathPoints, riverWidth, riverColor);
    });


        // Draw roads on top of rivers
        roads.forEach(roadPath => {
            const roadPathPoints = roadPath.map(hex => getHexCenter(hex.q, hex.r));
            drawRoad(roadPathPoints, roadWidth, roadColor);
        });
}

function getHexCoordsFromPixel(x, y) {
    const q = Math.round((x - hexWidth/2) / horizontalSpacing);
    const r = Math.round((y - hexHeight/2 - (q % 2) * (verticalSpacing / 2)) / verticalSpacing);
    return { q, r };
}


// Helper functions
function hexDistance(q1, r1, q2, r2) {
    return (Math.abs(q1 - q2) +
            Math.abs(q1 + r1 - q2 - r2) +
            Math.abs(r1 - r2)) / 2;
}

function findNearestWater(start, waters, width, height) {
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

function generateRiverPathHexes(start, end, width, height, rand, terrainMap, minLength, maxLength, rivers) {
    const path = [];
    let current = { q: start.q, r: start.r };
    path.push(current);
    let steps = 1;
    let previousDirection = null;
    const visited = new Set();
    visited.add(`${current.q},${current.r}`);
    const riverHexes = new Set(); // Local set to track hexes in the current river path

    // Initialize riverHexes with hexes from existing rivers for collision detection
    rivers.forEach(riverPath => {
        riverPath.forEach(hex => {
            riverHexes.add(`${hex.q},${hex.r}`);
        });
    });

    while (steps < maxLength) {
        if (steps >= minLength && terrainMap[current.r][current.q] === 'water') {
            break;
        }

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

        // Terrain preference weighting
        const weightedNeighbors = neighbors.map(n => {
            let weight = 1;
            if (terrainMap[n.r][n.q] === 'plains') {
                weight = 3; // Higher weight for plains
            } else if (terrainMap[n.r][n.q] !== 'water') {
                weight = 1.5; // Slightly prefer other non-water terrains over water avoidance initially
            }

            // Bias towards the end (water)
            const distanceWeight = Math.max(0.1, 1 - (hexDistance(n.q, n.r, end.q, end.r) / hexDistance(start.q, start.r, end.q, end.r))); // Closer to end = higher weight
            weight *= (1 + distanceWeight);

            return { pos: n, weight };
        });

        // Select next position with weighted randomness
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

        // River collision check
        if (riverHexes.has(`${next.q},${next.r}`)) {
            return null; // Stop drawing this river if it collides
        }


        path.push(next);
        visited.add(`${next.q},${next.r}`);
        riverHexes.add(`${next.q},${next.r}`); // Add current hex to river hexes set
        current = next;
        steps++;
    }

    if (path.length < 2) return null; // River too short or invalid path

    // Add intermediate points between hex centers
    return path;
}

function getHexCenter(q, r) {
    const horizontalSpacing = hexWidth * 0.75; // Use consistent spacing
    const verticalSpacing = hexHeight * 0.866;
    return {
        x: horizontalSpacing * q + hexWidth/2,
        y: verticalSpacing * r + (q % 2) * (verticalSpacing / 2) + hexHeight/2
    };
}


// Function to smooth the elevation map
function smoothElevationMap(elevationMap, width, height, iterations) {
    for (let iter = 0; iter < iterations; iter++) {
        const newElevationMap = [];
        for (let r = 0; r < height; r++) {
            newElevationMap[r] = [];
            for (let q = 0; q < width; q++) {
                let sum = 0;
                let count = 0;
                const neighbors = getNeighbors(q, r, width, height);
                neighbors.push([q, r]); // Include self
                for (let [nq, nr] of neighbors) {
                    sum += elevationMap[nr][nq];
                    count++;
                }
                newElevationMap[r][q] = sum / count;
            }
        }
        // Copy newElevationMap back into elevationMap
        for (let r = 0; r < height; r++) {
            for (let q = 0; q < width; q++) {
                elevationMap[r][q] = newElevationMap[r][q];
            }
        }
    }
}

// Function to get neighbors in a hex grid
function getNeighbors(q, r, width, height) {
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

// Function to draw a single hex tile
function drawHexTile(q, r, terrain) {
    const x = horizontalSpacing * q;
    const y = verticalSpacing * r + (q % 2) * (verticalSpacing / 2);
    const scaleFactor = parseFloat(document.getElementById('scaleFactor').value);

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
        const offsetX = (scaledWidth - hexWidth) / -2; // Removed +10 for proper alignment
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
function drawHexagon(ctx, x, y) {
    const size = hexWidth / 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i);
        const xi = x + size * Math.cos(angle);
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

// Seeded random number generator (Mulberry32)
function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

function resizeCanvas() {
    const canvas = document.getElementById('mapCanvas');
    const containerWidth = canvas.parentElement.offsetWidth; // Get the container width

    // Calculate the canvas internal dimensions based on the grid size
    canvas.width = gridWidthInput * 40; // Logical width
    canvas.height = gridHeightInput * 40; // Logical height

    // Adjust the CSS width to fit the container, keeping the aspect ratio
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${(canvas.height / canvas.width) * containerWidth}px`;
}

// Call resizeCanvas on load
window.addEventListener('load', resizeCanvas);

// Call resizeCanvas on window resize
window.addEventListener('resize', resizeCanvas);



function getInfluenceFactor(terrainType) {
    return parseFloat(clusteringSliders[terrainType].value);
}

function findEnclosedLakes(terrainMap, width, height) {
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

function findCoastalWaters(terrainMap, width, height) {
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

function generateMountainRange(start, width, height, terrainMap, rand) {
    const length = Math.floor(5 + rand() * 5);
    let current = {...start};
    let dir = rand() * Math.PI * 2;

    for (let i = 0; i < length; i++) {
        if (!terrainMap[current.r] || !terrainMap[current.r][current.q]) continue;
        terrainMap[current.r][current.q] = 'mountain';

        // Spread in direction with some variation
        dir += (rand() - 0.5) * Math.PI/2;
        current.q += Math.round(Math.cos(dir));
        current.r += Math.round(Math.sin(dir));

        // Keep within bounds
        current.q = Math.max(0, Math.min(width-1, current.q));
        current.r = Math.max(0, Math.min(height-1, current.r));
    }
}

document.getElementById('riverMinLength').addEventListener('change', function() {
    const maxInput = document.getElementById('riverMaxLength');
    if (parseInt(this.value) > parseInt(maxInput.value)) {
        maxInput.value = this.value;
    }
});

document.getElementById('riverMaxLength').addEventListener('change', function() {
    const minInput = document.getElementById('riverMinLength');
    if (parseInt(this.value) < parseInt(minInput.value)) {
        minInput.value = this.value;
    }
});

function generateRoadPathHexesForNetwork(start, end, width, height, rand, terrainMap, roads, rivers, existingRoadHexes) {
    const path = [];
    let current = { q: start.q, r: start.r };
    path.push(current);
    let steps = 1;
    const visited = new Set();
    visited.add(`${current.q},${current.r}`);
    const roadHexes = new Set(existingRoadHexes); // Start with existing road hexes for collision

    const maxLength = 50; // Maximum road length, adjust as needed
    const maxSteps = 200; // Add a maximum step limit to prevent infinite loops

    while (steps < maxLength && steps < maxSteps) { // Added step limit check
         if (hexDistance(current.q, current.r, end.q, end.r) < 2) { //Stop close to the target
            path.push(end); // move directly to end
            break;
        }

        let neighbors = getNeighbors(current.q, current.r, width, height)
            .map(([q, r]) => ({ q, r }))
            .filter(n => !visited.has(`${n.q},${n.r}`));

        neighbors = neighbors.filter(n => terrainMap[n.r][n.q] !== 'water'); // Roads cannot cross water

        if (neighbors.length === 0) break;

        // Terrain preference for roads (same as before)
        const weightedNeighbors = neighbors.map(n => {
            let weight = 1;
            if (terrainMap[n.r][n.q] === 'plains') {
                weight = 2; // Prefer plains
            } else if (terrainMap[n.r][n.q] === 'forest') {
                weight = 1.5; // Then forest
            } else if (terrainMap[n.r][n.q] === 'mountain') {
                weight = 0.1; // Avoid mountains
            }

            // Bias towards the target settlement (end) - Reduced bias for network roads
            const distanceWeight = Math.max(0.1, 1 - (hexDistance(n.q, n.r, end.q, end.r) / hexDistance(start.q, start.r, end.q, end.r)));
            weight *= (1 + distanceWeight * 1.5); // Reduced bias

            return { pos: n, weight };
        });

        // Select next position with weighted randomness
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

        if (roadHexes.has(`${next.q},${next.r}`)) {
            return null; // Collision with existing road
        }

        path.push(next);
        visited.add(`${next.q},${next.r}`);
        roadHexes.add(`${next.q},${next.r}`);
        current = next;
        steps++;
    }

    if (steps >= maxSteps) {
        console.warn("Road generation reached maximum steps, pathfinding might be stuck.");
        return null; // Indicate pathfinding failure due to max steps
    }

    return path;
}
function generateRoadNetwork(settlements, mapWidth, mapHeight, rand, terrainMap, rivers) {
    const roadNetwork = [];
    const connectedSettlements = new Set(); // Keep track of connected settlements
    let allRoadHexes = new Set(); // Track all road hexes for collision

    if (settlements.length < 2) return roadNetwork; // Need at least 2 settlements

    connectedSettlements.add(settlements[0]); // Start with the first settlement
    let currentSettlement = settlements[0];
    let networkBuildAttempts = 0; // Counter to prevent infinite network building attempts
    const maxNetworkAttempts = settlements.length * 3; // Limit network building attempts

    while (connectedSettlements.size < settlements.length && networkBuildAttempts < maxNetworkAttempts) { // Added network build attempt limit
        networkBuildAttempts++;
        const nearestUnconnected = findNearestUnconnectedSettlement(currentSettlement, settlements, connectedSettlements);

        if (!nearestUnconnected) {
            console.log("No nearest unconnected settlement found, road network generation stopping early.");
            break; // No more unconnected settlements
        }

        console.log(`Attempting to connect ${currentSettlement.q},${currentSettlement.r} to ${nearestUnconnected.q},${nearestUnconnected.r}`); // Debug log

        const roadPathHexes = generateRoadPathHexesForNetwork(
            currentSettlement, nearestUnconnected, mapWidth, mapHeight, rand, terrainMap, roadNetwork, rivers, allRoadHexes
        );

        if (roadPathHexes) {
            console.log(`Road path found between ${currentSettlement.q},${currentSettlement.r} and ${nearestUnconnected.q},${nearestUnconnected.r}, length: ${roadPathHexes.length}`); // Debug log
            roadNetwork.push(roadPathHexes);
            roadPathHexes.forEach(hex => allRoadHexes.add(`${hex.q},${hex.r}`));
            connectedSettlements.add(nearestUnconnected);
            currentSettlement = nearestUnconnected; // Extend from the newly connected settlement
        } else {
            console.log(`Failed to generate road path from ${currentSettlement.q},${currentSettlement.r} to ${nearestUnconnected.q},${nearestUnconnected.r}. Trying alternative start.`); // Debug log
            // Road generation failed, try starting from a different connected settlement
            const nextStartSettlement = findAlternativeStartSettlement(settlements, connectedSettlements, nearestUnconnected);
            if (nextStartSettlement) {
                console.log(`Trying alternative start settlement: ${nextStartSettlement.q},${nextStartSettlement.r}`); // Debug log
                currentSettlement = nextStartSettlement;
                continue; // Retry from a different starting point
            } else {
                console.log("No alternative start settlement found, road network generation stopping for this branch."); // Debug log
                break; // No alternative start, stop road generation for this branch
            }
        }
    }

    if (networkBuildAttempts >= maxNetworkAttempts) {
        console.warn("Road network generation reached maximum attempts, network might be incomplete.");
    }
    console.log("Road network generation finished, connected settlements:", connectedSettlements.size, "out of", settlements.length); // Debug log
    return roadNetwork;
}
function findAlternativeStartSettlement(settlements, connectedSettlements, failedEndSettlement) {
    // Try to find another connected settlement to connect to the failedEndSettlement
    let minDist = Infinity;
    let bestStart = null;

    for (const connectedSettlement of connectedSettlements) {
        const dist = hexDistance(connectedSettlement.q, connectedSettlement.r, failedEndSettlement.q, failedEndSettlement.r);
        if (dist < minDist) {
            minDist = dist;
            bestStart = connectedSettlement;
        }
    }
    console.log(`Alternative start settlement found: ${bestStart ? bestStart.q + ',' + bestStart.r : 'none'}`); // Debug log
    return bestStart; // Return the closest connected settlement, or null if none
}


function findNearestUnconnectedSettlement(startSettlement, allSettlements, connectedSettlements) {
    let nearestSettlement = null;
    let minDistance = Infinity;

    for (const settlement of allSettlements) {
        if (!connectedSettlements.has(settlement)) {
            const dist = hexDistance(startSettlement.q, startSettlement.r, settlement.q, settlement.r);
            if (dist < minDistance) {
                minDistance = dist;
                nearestSettlement = settlement;
            }
        }
    }
    console.log(`Nearest unconnected settlement to ${startSettlement.q},${startSettlement.r}: ${nearestSettlement ? nearestSettlement.q + ',' + nearestSettlement.r : 'none'}`); // Debug log
    return nearestSettlement;
}


