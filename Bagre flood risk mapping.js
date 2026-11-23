// Define study area - adjust coordinates to your area
var studyArea = ee.Geometry.Rectangle([
  -0.3, 10.5, 0.8, 11.3  // rough White Volta / Yapala area
]);

// Load Sentinel-1 collection
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(studyArea)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .select('VV');

// Dry season composite (Jan-Feb 2024)
var dry = s1
  .filterDate('2024-01-01', '2024-02-28')
  .mean()
  .clip(studyArea);

// Wet season composite (Sep-Oct 2023)
var wet = s1
  .filterDate('2023-09-01', '2023-10-31')
  .mean()
  .clip(studyArea);

// Visualisation parameters for SAR
var sarVis = {min: -25, max: 0, palette: ['black','white']};

Map.centerObject(studyArea, 10);
Map.addLayer(dry, sarVis, 'Dry Season (Jan-Feb 2024)');
Map.addLayer(wet, sarVis, 'Wet Season (Sep-Oct 2023)');

// Apply focal mean filter to reduce speckle noise first
var drySmooth = dry.focal_mean(3, 'circle', 'pixels');
var wetSmooth = wet.focal_mean(3, 'circle', 'pixels');

// Change from -18 back to -16 (middle ground between too noisy and too strict)
var dryWater = drySmooth.lt(-16);
var wetWater = wetSmooth.lt(-16);

// Flood = water in wet but not dry season
var flood = wetWater.subtract(dryWater).gt(0);

// Change from 5 to 3 minimum connected pixels
var floodCleaned = flood
  .selfMask()
  .connectedPixelCount(25, false)
  .gte(3)
  .selfMask();

// Visualise
Map.addLayer(dryWater.selfMask(), 
  {palette:['blue']}, 'Permanent Water');
Map.addLayer(floodCleaned, 
  {palette:['red']}, 'Flooded Areas (Cleaned)');
  
  // Export flood map to Google Drive
Export.image.toDrive({
  image: floodCleaned,
  description: 'Bagre_Flood_Extent_2023',
  folder: 'GEE_Exports',
  fileNamePrefix: 'Bagre_Flood_2023',
  region: studyArea,
  scale: 20,
  crs: 'EPSG:32630',
  maxPixels: 1e10
});

// Export permanent water layer too
Export.image.toDrive({
  image: dryWater.selfMask(),
  description: 'Permanent_Water_Dry_2024',
  folder: 'GEE_Exports',  
  fileNamePrefix: 'Permanent_Water_2024',
  region: studyArea,
  scale: 20,
  crs: 'EPSG:32630',
  maxPixels: 1e10
});
