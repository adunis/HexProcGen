// images.js
import { terrainTypes, terrainImages } from './config.js';

// Load images function with callback
export function loadImages(callback) {
  let imagesToLoad = 0;

  // For each terrain type, clear its image array and load the new images.
  terrainTypes.forEach((type) => {
    terrainImages[type] = [];
    const typeImages = getTypeImages(type);
    imagesToLoad += typeImages.length;

    typeImages.forEach((src) => {
      const img = new Image();
      img.src = src;

      img.onload = () => {
        imagesToLoad--;
        if (imagesToLoad === 0) {
          callback();
        }
      };

      img.onerror = () => {
        console.error(`Failed to load image: ${img.src}`);
        imagesToLoad--;
        if (imagesToLoad === 0) {
          callback();
        }
      };

      terrainImages[type].push(img);
    });
  });
}

// Function to get image source file paths for each terrain type.
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
      images.push('assets/wetland5.png');
      images.push('assets/wetland6.png');
      images.push('assets/wetland7.png');
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
    // New terrain types:
    case 'snow':
      // 5 images for snow
      images.push('assets/snow1.png');
      images.push('assets/snow2.png');
      images.push('assets/snow3.png');
      images.push('assets/snow4.png');
      images.push('assets/snow5.png');
      break;
    case 'snowmountain':
      // 4 images for snowmountain
      images.push('assets/snowmountain1.png');
      images.push('assets/snowmountain2.png');
      images.push('assets/snowmountain3.png');
      images.push('assets/snowmountain4.png');
      break;
    case 'dune':
      // 7 images for dune
      images.push('assets/dune1.png');
      images.push('assets/dune2.png');
      images.push('assets/dune3.png');
      images.push('assets/dune4.png');
      images.push('assets/dune5.png');
      images.push('assets/dune6.png');
      images.push('assets/dune7.png');
      break;
    case 'hills':
      // 5 images for hills
      images.push('assets/hills1.png');
      images.push('assets/hills2.png');
      images.push('assets/hills3.png');
      images.push('assets/hills4.png');
      images.push('assets/hills5.png');
      break;
    case 'snowhills':
      // 5 images for snowhills
      images.push('assets/snowhills1.png');
      images.push('assets/snowhills2.png');
      images.push('assets/snowhills3.png');
      images.push('assets/snowhills4.png');
      images.push('assets/snowhills5.png');
      break;
    case 'volcano':
      // 2 images for volcano
      images.push('assets/volcano1.png');
      images.push('assets/volcano2.png');
      break;
    case 'badvolcano':
      // 2 images for badvolcano
      images.push('assets/badvolcano1.png');
      images.push('assets/badvolcano2.png');
      break;
    case 'snowvolcano':
      // 2 images for snowvolcano
      images.push('assets/snowvolcano1.png');
      images.push('assets/snowvolcano2.png');
      break;
    case 'badmountain':
      // 3 images for badmountain
      images.push('assets/badmountain1.png');
      images.push('assets/badmountain2.png');
      images.push('assets/badmountain3.png');
      break;
    default:
      // For unknown types, do nothing.
      break;
  }
  return images;
}
