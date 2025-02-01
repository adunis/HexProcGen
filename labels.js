// labels.js
import { terrainConfig } from './config.js';
import { getContext } from './canvas.js';

// Reset to default labels - Event listener in controls.js or main.js to call initLabelSettings
document.getElementById('resetLabelSettings')?.addEventListener('click', () => {
    initLabelSettings(); // Re-initialize with defaults
});

// Initialize on load - Call in main.js
document.addEventListener('DOMContentLoaded', initLabelSettings);

// Initialize Label UI
export function initLabelSettings() {
    const container = document.getElementById('labelSettingsContainer');
    container.innerHTML = '';
    const template = document.getElementById('labelSettingsTemplate');

    Object.entries(terrainConfig).forEach(([terrain, config]) => {
        const clone = template.content.cloneNode(true);
        const settingsDiv = clone.querySelector('.terrain-label-settings');
        settingsDiv.dataset.terrain = terrain;

        const inputs = clone.querySelectorAll('input, textarea');
        inputs[0].value = config.chance;
        inputs[1].value = config.size;
        inputs[2].value = config.color;
        inputs[3].value = config.names.join(', ');
        inputs[4].value = config.keywords.list.join(', ');
        inputs[5].value = config.keywords.weights.join(', ');

        clone.querySelector('.toggle-settings').addEventListener('click', () => {
            const content = settingsDiv.querySelector('.settings-content');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        });

        container.appendChild(clone);
    });
}

// Get label config from UI
export function getLabelConfig() {
    const config = {};
    document.querySelectorAll('.terrain-label-settings').forEach(settingsDiv => {
        const terrain = settingsDiv.dataset.terrain;
        const inputs = settingsDiv.querySelectorAll('input, textarea');

        config[terrain] = {
            chance: parseInt(inputs[0].value),
            size: parseInt(inputs[1].value),
            color: inputs[2].value,
            names: inputs[3].value.split(',').map(n => n.trim()).filter(n => n),
            keywords: {
                list: inputs[4].value.split(',').map(k => k.trim()).filter(k => k),
                weights: inputs[5].value.split(',').map(w => parseInt(w.trim())).filter(w => !isNaN(w))
            }
        };

        if (config[terrain].keywords.weights.length !== config[terrain].keywords.list.length) {
            config[terrain].keywords.weights = new Array(config[terrain].keywords.list.length).fill(1);
        }
    });
    return config;
}

// Modified drawing code
export function drawLabel(center, name, keywords, terrainConfig) {
    const ctx = getContext();
    ctx.fillStyle = terrainConfig.color;
    ctx.font = `${terrainConfig.size}px MedievalSharp`;
    ctx.textAlign = 'center';

    // Shadow for the main name
    ctx.fillStyle = "black"; // Shadow color
    ctx.fillText(name, center.x + 3, center.y + 32); // Offset by 2 pixels

    // Draw main name
    ctx.fillStyle = terrainConfig.color;
    ctx.fillText(name, center.x, center.y + 30);

    // Draw subtitle with shadow
    if (keywords.length > 0) {
        ctx.font = `${terrainConfig.size * 0.6}px MedievalSharp`;

        // Shadow for the subtitle
        ctx.fillStyle = "black"; // Shadow color
        const subtitle = keywords.join(' • ');
        ctx.fillText(subtitle, center.x + 2, center.y + 70); // Offset by 1 pixel

        // Draw subtitle
        ctx.fillStyle = terrainConfig.color;
        ctx.fillText(subtitle, center.x, center.y + 70);
    }
}

// Utility function to get weighted random keywords
export function getKeywords(terrainConfig, count) {
    const results = [];
    const tempList = [...terrainConfig.keywords.list];
    const tempWeights = [...terrainConfig.keywords.weights];

    // Weighted random selection with decreasing probability
    const positionWeights = [100, 50, 30, 10, 5]; // Probability for 1st, 2nd, etc. keyword

    for (let i = 0; i < Math.min(5, count); i++) {
        if (tempList.length === 0) break;

        const totalWeight = tempWeights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        let selectedIndex = 0;

        while (random > tempWeights[selectedIndex]) {
            random -= tempWeights[selectedIndex];
            selectedIndex++;
        }

        // Add position-based probability
        if (Math.random() > positionWeights[i]/100) break;

        results.push(tempList[selectedIndex]);
        // Remove selected item to prevent duplicates
        tempList.splice(selectedIndex, 1);
        tempWeights.splice(selectedIndex, 1);
    }

    return results;
}