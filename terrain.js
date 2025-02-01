// terrain.js
import { sliders, percentages, clusteringSliders } from './controls.js';
import { terrainTypes, presets } from './config.js';
import { getNeighbors } from './utils.js';

// Initialize sliders to ensure total is 100% on page load
document.addEventListener('DOMContentLoaded', () => {
    adjustSliders(Object.keys(sliders)[0]);
    updatePercentageDisplay();
});

export function adjustSliders(changedKey) {
    const changedValue = parseInt(sliders[changedKey].value, 10);
    let total = 0;

    for (let key in sliders) {
        if (key !== changedKey) {
            total += parseInt(sliders[key].value, 10);
        }
    }

    const remaining = 100 - changedValue;

    const keysToAdjust = Object.keys(sliders).filter(key => key !== changedKey);
    let redistributedValues = [];
    if (total > 0) {
        keysToAdjust.forEach((key) => {
            const currentValue = parseInt(sliders[key].value, 10);
            const proportion = currentValue / total;
            redistributedValues.push(Math.round(proportion * remaining));
        });
    } else {
        const equalValue = Math.floor(remaining / keysToAdjust.length);
        redistributedValues = keysToAdjust.map((_, index) =>
            index === keysToAdjust.length - 1
                ? remaining - equalValue * (keysToAdjust.length - 1)
                : equalValue
        );
    }

    keysToAdjust.forEach((key, index) => {
        sliders[key].value = redistributedValues[index];
    });

    let actualTotal = changedValue + redistributedValues.reduce((sum, val) => sum + val, 0);
    let roundingError = 100 - actualTotal;

    if (roundingError !== 0) {
        const maxKey = Object.keys(sliders).reduce((max, key) =>
            parseInt(sliders[key].value, 10) > parseInt(sliders[max].value, 10) ? key : max,
            Object.keys(sliders)[0]
        );
        sliders[maxKey].value = parseInt(sliders[maxKey].value, 10) + roundingError;
    }

    updatePercentageDisplay();
}

export function updatePercentageDisplay() {
    for (let key in sliders) {
        percentages[key].textContent = sliders[key].value + '%';
    }
}

export function applyPreset(presetName) {
    const config = presets[presetName];
    for (let key in config) {
        sliders[key].value = config[key];
    }
    updatePercentageDisplay();
}

export function getInfluenceFactor(terrainType) {
    if (clusteringSliders[terrainType] === undefined) {
        console.warn(`Clustering slider for terrain type '${terrainType}' is undefined. Returning default influence factor of 0.`);
        return 0;
    }
    return parseFloat(clusteringSliders[terrainType].value);
}

export function generateTerrainMap(mapWidth, mapHeight, seed) {
    const rand = mulberry32(seed);

    const terrainPercentages = {
        water: parseInt(sliders.water.value, 10) / 100,
        wetland: parseInt(sliders.wetland.value, 10) / 100,
        plains: parseInt(sliders.plains.value, 10) / 100,
        forest: parseInt(sliders.forest.value, 10) / 100,
        mountain: parseInt(sliders.mountain.value, 10) / 100,
        urban: parseInt(sliders.urban.value, 10) / 100,
        ruins: parseInt(sliders.ruins.value, 10) / 100,
        snow: parseInt(sliders.snow.value, 10) / 100,
        snowmountain: parseInt(sliders.snowmountain.value, 10) / 100,
        dune: parseInt(sliders.dune.value, 10) / 100,
        hills: parseInt(sliders.hills.value, 10) / 100,
        snowhills: parseInt(sliders.snowhills.value, 10) / 100,
        volcano: parseInt(sliders.volcano.value, 10) / 100,
        badvolcano: parseInt(sliders.badvolcano.value, 10) / 100,
        snowvolcano: parseInt(sliders.snowvolcano.value, 10) / 100,
        badmountain: parseInt(sliders.badmountain.value, 10) / 100,
        wheatfield: 0  // Wheatfield is generated around settlements, not randomly
      };
      

    const totalPercentage = Object.values(terrainPercentages).reduce((sum, val) => sum + val, 0);
    for (let key in terrainPercentages) {
        if (key !== 'wheatfield') {
            terrainPercentages[key] /= totalPercentage;
        }
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
    return terrainMap;
}

export function generateMountainRange(start, width, height, terrainMap, rand) {
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

// NEW FUNCTION to generate wheatfields around settlements
export function generateWheatFieldsAroundSettlements(terrainMap, settlements, width, height, rand) {
    const wheatfieldChance = 0.7; // Chance for a plains tile to become wheatfield
    const maxWheatfieldsPerSettlement = 7; // Limit wheatfields per settlement

    settlements.forEach(settlement => {
        let wheatfieldCount = 0;
        const neighbors = getNeighbors(settlement.q, settlement.r, width, height);
        neighbors.forEach(([nq, nr]) => {
            if (wheatfieldCount < maxWheatfieldsPerSettlement && terrainMap[nr] && terrainMap[nr][nq] === 'plains' && rand() < wheatfieldChance) {
                terrainMap[nr][nq] = 'wheatfield';
                wheatfieldCount++;
            }
        });
    });
}

// Seeded random number generator (Mulberry32) (Move to utils.js)
function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}