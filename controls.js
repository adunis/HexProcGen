// controls.js
import { adjustSliders, updatePercentageDisplay, applyPreset } from './terrain.js';
import { loadImages } from './images.js';
import { generateMap } from './main.js';

// Controls for grid dimensions and map generation.
const gridWidthInput = document.getElementById('gridWidth');
const gridHeightInput = document.getElementById('gridHeight');
const generateButton = document.getElementById('generateButton');

// --- Terrain Percentage Sliders ---
// Existing terrain types...
export const sliders = {
  water: document.getElementById('waterSlider'),
  wetland: document.getElementById('wetlandSlider'),
  plains: document.getElementById('plainsSlider'),
  forest: document.getElementById('forestSlider'),
  mountain: document.getElementById('mountainSlider'),
  urban: document.getElementById('urbanSlider'),
  ruins: document.getElementById('ruinsSlider'),

  snow: document.getElementById('snowSlider'),
  snowmountain: document.getElementById('snowmountainSlider'),
  dune: document.getElementById('duneSlider'),
  hills: document.getElementById('hillsSlider'),
  snowhills: document.getElementById('snowhillsSlider'),
  volcano: document.getElementById('volcanoSlider'),
  badvolcano: document.getElementById('badvolcanoSlider'),
  snowvolcano: document.getElementById('snowvolcanoSlider'),
  badmountain: document.getElementById('badmountainSlider')
};

export const percentages = {
  water: document.getElementById('waterPercent'),
  wetland: document.getElementById('wetlandPercent'),
  plains: document.getElementById('plainsPercent'),
  forest: document.getElementById('forestPercent'),
  mountain: document.getElementById('mountainPercent'),
  urban: document.getElementById('urbanPercent'),
  ruins: document.getElementById('ruinsPercent'),
  snow: document.getElementById('snowPercent'),
  snowmountain: document.getElementById('snowmountainPercent'),
  dune: document.getElementById('dunePercent'),
  hills: document.getElementById('hillsPercent'),
  snowhills: document.getElementById('snowhillsPercent'),
  volcano: document.getElementById('volcanoPercent'),
  badvolcano: document.getElementById('badvolcanoPercent'),
  snowvolcano: document.getElementById('snowvolcanoPercent'),
  badmountain: document.getElementById('badmountainPercent')
};

// --- Clustering Sliders ---
export const clusteringSliders = {
  water: document.getElementById('waterClustering'),
  wetland: document.getElementById('wetlandClustering'),
  plains: document.getElementById('plainsClustering'),
  forest: document.getElementById('forestClustering'),
  mountain: document.getElementById('mountainClustering'),
  urban: document.getElementById('urbanClustering'),
  ruins: document.getElementById('ruinsClustering'),
  snow: document.getElementById('snowClustering'),
  snowmountain: document.getElementById('snowmountainClustering'),
  dune: document.getElementById('duneClustering'),
  hills: document.getElementById('hillsClustering'),
  snowhills: document.getElementById('snowhillsClustering'),
  volcano: document.getElementById('volcanoClustering'),
  badvolcano: document.getElementById('badvolcanoClustering'),
  snowvolcano: document.getElementById('snowvolcanoClustering'),
  badmountain: document.getElementById('badmountainClustering')
};

// --- River Properties ---
export const riverCountInput = document.getElementById('riverCount');
export const riverWidthInput = document.getElementById('riverWidth');
export const riverColorInput = document.getElementById('riverColor');
export const riverCurvatureInput = document.getElementById('riverCurvature');
export const riverCurveSegmentsInput = document.getElementById('riverCurveSegments');
export const riverMinLengthInput = document.getElementById('riverMinLength');
export const riverMaxLengthInput = document.getElementById('riverMaxLength');

// --- Road Properties ---
export const roadCountInput = document.getElementById('roadCount');
export const roadWidthInput = document.getElementById('roadWidth');
export const roadColorInput = document.getElementById('roadColor');
export const roadCurvatureInput = document.getElementById('roadCurvature');
export const roadCurveSegmentsInput = document.getElementById('roadCurveSegments');
export const roadDashLengthInput = document.getElementById('roadDashLength');
export const roadDashGapInput = document.getElementById('roadDashGap');
export const scaleFactorInput = document.getElementById('scaleFactor');

// Attach event listeners to terrain sliders.
// This loop now includes all keys in the sliders object.
for (let key in sliders) {
  sliders[key].addEventListener('input', () => {
    adjustSliders(key);
    updatePercentageDisplay();
  });
}

// Attach event listeners to clustering sliders.
for (let key in clusteringSliders) {
  clusteringSliders[key].addEventListener('input', () => {
    clusteringValues[key].textContent = clusteringSliders[key].value;
  });
}

// Attach event listeners to preset buttons.
document.querySelectorAll('.presetButton').forEach(button => {
  button.addEventListener('click', () => applyPreset(button.dataset.preset));
});

// Generate Map Button Click Event
generateButton.addEventListener('click', () => {
  const width = parseInt(gridWidthInput.value);
  const height = parseInt(gridHeightInput.value);
  const seed = Date.now();

  // Validate that the total of all terrain percentages equals 100%.
  const totalPercent = Object.values(sliders).reduce((total, slider) => total + parseInt(slider.value, 10), 0);
  if (totalPercent !== 100) {
    alert('The total of terrain percentages must equal 100%.');
    return;
  }

  loadImages(() => {
    generateMap(width, height, seed);
  });
});

// Ensure river min and max lengths are consistent.
riverMinLengthInput.addEventListener('change', function() {
  if (parseInt(this.value) > parseInt(riverMaxLengthInput.value)) {
    riverMaxLengthInput.value = this.value;
  }
});

riverMaxLengthInput.addEventListener('change', function() {
  if (parseInt(this.value) < parseInt(riverMinLengthInput.value)) {
    riverMinLengthInput.value = this.value;
  }
});
