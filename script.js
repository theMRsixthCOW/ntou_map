// =======================================
// INITIALIZE OSM BUILDINGS (STANDALONE)
// =======================================
let map = null;

function initializeMap() {
    // Wait for DOM and OSM Buildings to be ready
    if (typeof OSMBuildings === 'undefined') {
        setTimeout(initializeMap, 100);
        return;
    }

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        setTimeout(initializeMap, 100);
        return;
    }

    try {
        console.log("Initializing OSM Buildings map...");
        map = new OSMBuildings({
            container: 'map',
            position: { latitude: 25.14953, longitude: 121.77685 },
            zoom: 16,
            minZoom: 15,
            maxZoom: 20,
            tilt: 31,
            effects: ['shadows'],
            attribution: '© Data <a href="https://openstreetmap.org/copyright/">OpenStreetMap</a> © Map <a href="https://mapbox.com/">Mapbox</a> © 3D <a href="https://osmbuildings.org/copyright/">OSM Buildings</a>'
        });

        console.log("Map created, adding tiles...");
        map.addMapTiles('https://tile-a.openstreetmap.fr/hot/{z}/{x}/{y}.png');
        // Note: You may need to get your own API key from https://osmbuildings.org/data/
        // For now, using a public tile source
        map.addGeoJSONTiles('https://{s}.data.osmbuildings.org/0.2/anonymous/tile/{z}/{x}/{y}.json');

        console.log("Map initialized successfully");
        updateStatus("Map initialized");
        
        // Wait a bit for map to fully render, then load data
        setTimeout(() => {
            loadBuildingData();
            loadExportBuildings();
            setupSearchInputs();
            setupNavigation();
            setupMapClickHandler();
        }, 500);
    } catch (error) {
        console.error("Error initializing map:", error);
        updateStatus("Map initialization failed: " + error.message, true);
    }
}

// =======================================
// GLOBAL DATA
// =======================================
let buildingData = [];
let exportBuildings = null;
let navLine = null;
let currentHighlightedBuilding = null;
let infoBox = null;
let debounceTimer = null;
let highlightedBuildings = [];

// =======================================
// LOAD BUILDING DATA
// =======================================
async function loadBuildingData() {
    try {
        const response = await fetch("data.json");
        buildingData = await response.json();
        updateStatus("SYSTEM ONLINE");
    } catch (err) {
        console.error(err);
        updateStatus("Failed loading building data", true);
    }
}

// =======================================
// LOAD EXPORT BUILDINGS AND HIGHLIGHT
// =======================================
async function loadExportBuildings() {
    if (!map) {
        setTimeout(loadExportBuildings, 200);
        return;
    }

    try {
        const response = await fetch("export.geojson");
        exportBuildings = await response.json();
        
        // Process and highlight buildings with bright orange
        if (exportBuildings && exportBuildings.features) {
            exportBuildings.features.forEach(feature => {
                if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
                    // Style building with bright orange
                    feature.properties = feature.properties || {};
                    feature.properties.wallColor = 'rgb(255, 165, 0)'; // Bright orange
                    feature.properties.roofColor = 'rgb(255, 140, 0)'; // Slightly darker orange for roof
                    // Set height - use building:levels if available, otherwise default
                    if (feature.properties['building:levels']) {
                        feature.properties.height = parseInt(feature.properties['building:levels']) * 3.5; // ~3.5m per floor
                    } else {
                        feature.properties.height = feature.properties.height || 15; // Default height
                    }
                    feature.properties.minHeight = 0;
                }
            });
            
            // Add buildings to map with orange styling
            console.log(`Adding ${exportBuildings.features.length} buildings to map...`);
            
            // Check available methods
            console.log("Available map methods:", Object.keys(map).filter(k => typeof map[k] === 'function'));
            
            // Try different methods to add GeoJSON
            try {
                if (typeof map.set === 'function') {
                    console.log("Using map.set() method");
                    map.set(exportBuildings);
                    updateStatus(`Loaded ${exportBuildings.features.length} buildings (highlighted in orange)`);
                } else if (typeof map.addGeoJSON === 'function') {
                    console.log("Using map.addGeoJSON() method");
                    map.addGeoJSON(exportBuildings);
                    updateStatus(`Loaded ${exportBuildings.features.length} buildings (highlighted in orange)`);
                } else {
                    console.warn("No suitable method found to add GeoJSON");
                    updateStatus("GeoJSON loaded but cannot add to map", true);
                }
            } catch (err) {
                console.error("Error adding GeoJSON:", err);
                updateStatus("Failed to add buildings to map: " + err.message, true);
            }
        }
    } catch (err) {
        console.error("Error loading export.geojson:", err);
        updateStatus("Failed loading export buildings", true);
    }
}

// Initialize map when page loads
window.addEventListener("load", () => {
    initializeMap();
});

// =======================================
// UI STATUS
// =======================================
function updateStatus(message, isError = false) {
    const el = document.getElementById("status-message");
    if (el) {
        el.textContent = message;
        if (isError) {
            el.style.color = "#d32f2f";
            el.classList.add("error");
        } else {
            el.style.color = "#2c5e4f";
            el.classList.remove("error");
        }
    }
}

// =======================================
// SEARCH FUNCTION
// =======================================
function findBuilding(term) {
    if (!term || !buildingData.length) return null;
    term = term.toLowerCase().trim();
    
    // First try exact match
    let exactMatch = buildingData.find(b =>
        b.name.toLowerCase() === term ||
        b.name_ch.toLowerCase() === term ||
        b.code_id.toLowerCase() === term ||
        b.number === term ||
        b.location_code.toLowerCase() === term
    );
    if (exactMatch) return exactMatch;
    
    // Then try partial match
    return buildingData.find(b =>
        b.name.toLowerCase().includes(term) ||
        b.name_ch.toLowerCase().includes(term) ||
        b.code_id.toLowerCase().includes(term) ||
        b.number.includes(term) ||
        b.location_code.toLowerCase().includes(term)
    );
}

// =======================================
// DEBOUNCED SEARCH INPUT
// =======================================
function setupSearchInputs() {
    const fromInput = document.getElementById("from-input");
    const toInput = document.getElementById("to-input");
    
    if (!fromInput || !toInput) return;
    
    [fromInput, toInput].forEach(input => {
        input.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const term = e.target.value.trim();
                if (term) {
                    const building = findBuilding(term);
                    if (building) {
                        updateStatus(`Found: ${building.name}`);
                    }
                }
            }, 300);
        });
    });
}

// =======================================
// NAVIGATION
// =======================================
function setupNavigation() {
    const navButton = document.getElementById("navigate-button");
    if (!navButton) {
        setTimeout(setupNavigation, 100);
        return;
    }
    
    navButton.addEventListener("click", () => {
        const fromTerm = document.getElementById("from-input").value;
        const toTerm = document.getElementById("to-input").value;

        const from = findBuilding(fromTerm);
        const to = findBuilding(toTerm);

        if (!from || !to) {
            updateStatus("請重新輸入", true);
            return;
        }
        if (from.number === to.number) {
            updateStatus("FROM and TO are the same!", true);
            if (navLine) {
                removeNavigationLine();
            }
            return;
        }

        drawNavigationLine(from, to);
    });
}


// =======================================
// DRAW NAVIGATION LINE
// =======================================
function drawNavigationLine(start, end) {
    if (!map) {
        updateStatus("Map not ready", true);
        return;
    }

    // Remove old line
    if (navLine) {
        removeNavigationLine();
    }

    // Create GeoJSON line with white color
    const lineFeature = {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: [
                [start.lon, start.lat],
                [end.lon, end.lat]
            ]
        },
        properties: {
            color: '#ffffff',
            width: 4,
            opacity: 0.9
        }
    };

    const lineCollection = {
        type: "FeatureCollection",
        features: [lineFeature]
    };

    // Add line to map
    try {
        navLine = map.addGeoJSON(lineCollection);
    } catch (err) {
        console.error("Error adding navigation line:", err);
        // Try alternative method
        try {
            navLine = map.set(lineCollection);
        } catch (err2) {
            console.error("Error with set method:", err2);
            updateStatus("Failed to draw navigation line", true);
        }
    }

    // Center map on both buildings
    const centerLat = (start.lat + end.lat) / 2;
    const centerLon = (start.lon + end.lon) / 2;
    
    map.setPosition({
        latitude: centerLat,
        longitude: centerLon,
        zoom: 17
    });

    updateStatus(`Path drawn: ${start.name} ➝ ${end.name}`);
}

// =======================================
// REMOVE NAVIGATION LINE
// =======================================
function removeNavigationLine() {
    if (navLine && map) {
        try {
            if (typeof map.removeGeoJSON === 'function') {
                map.removeGeoJSON(navLine);
            } else if (typeof map.remove === 'function') {
                map.remove(navLine);
            }
            navLine = null;
        } catch (err) {
            console.error("Error removing navigation line:", err);
            navLine = null;
        }
    }
}

// =======================================
// BUILDING CLICK INTERACTION
// =======================================
function createInfoBox(building) {
    // Remove existing info box
    if (infoBox) {
        infoBox.remove();
    }

    const infoContent = `
        <div class="building-info-box">
            
            <div class="info-row"><strong>NAME:</strong> ${building.name}</div>
            <div class="info-row"><strong>CHINESE:</strong> ${building.name_ch || 'N/A'}</div>
            <div class="info-row"><strong>CODE:</strong> ${building.code_id}</div>
            <div class="info-row"><strong>LOCATION GRID:</strong> ${building.location_code}</div>
        </div>
    `;

    // Create floating info box
    infoBox = document.createElement('div');
    infoBox.className = 'building-info-popup industrial-popup';
    infoBox.innerHTML = infoContent;
    document.body.appendChild(infoBox);
    
    // Position will be updated on mouse move
    return infoBox;
}

// =======================================
// BUILDING HIGHLIGHT
// =======================================
function highlightBuilding(building) {
    if (!map) return;

    // Remove previous highlight
    if (currentHighlightedBuilding && map) {
        try {
            if (typeof map.removeGeoJSON === 'function') {
                map.removeGeoJSON(currentHighlightedBuilding);
            } else if (typeof map.remove === 'function') {
                map.remove(currentHighlightedBuilding);
            }
            currentHighlightedBuilding = null;
        } catch (err) {
            console.error("Error removing highlight:", err);
            currentHighlightedBuilding = null;
        }
    }

    // Show info box
    createInfoBox(building);

    // Zoom to building
    map.setPosition({
        latitude: building.lat,
        longitude: building.lon,
        zoom: 18
    });

    updateStatus(`Selected: ${building.name}`);
}

// =======================================
// MAP CLICK HANDLER (for OSM Buildings)
// =======================================
// Note: OSM Buildings standalone doesn't have direct click-to-coordinate conversion
// We'll use building data to find nearest building based on map center proximity
function setupMapClickHandler() {
    if (!map) {
        setTimeout(setupMapClickHandler, 200);
        return;
    }

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        setTimeout(setupMapClickHandler, 200);
        return;
    }

    mapContainer.addEventListener('click', (e) => {
        if (!map) return;

        // Get current map position
        const mapPos = map.getPosition();
        
        // Find nearest building from buildingData within reasonable distance
        let nearestBuilding = null;
        let minDistance = Infinity;
        const clickRadius = 0.002; // Radius in degrees (~200m)

        buildingData.forEach(building => {
            const distance = Math.sqrt(
                Math.pow(building.lat - mapPos.latitude, 2) +
                Math.pow(building.lon - mapPos.longitude, 2)
            );

            if (distance < clickRadius && distance < minDistance) {
                minDistance = distance;
                nearestBuilding = building;
            }
        });

        if (nearestBuilding) {
            highlightBuilding(nearestBuilding);
        } else {
            // Close info box if clicking outside
            if (infoBox) {
                infoBox.remove();
                infoBox = null;
            }
            if (currentHighlightedBuilding && map) {
                try {
                    if (typeof map.removeGeoJSON === 'function') {
                        map.removeGeoJSON(currentHighlightedBuilding);
                    } else if (typeof map.remove === 'function') {
                        map.remove(currentHighlightedBuilding);
                    }
                    currentHighlightedBuilding = null;
                } catch (err) {
                    console.error("Error removing highlight:", err);
                    currentHighlightedBuilding = null;
                }
            }
        }
    });
}

// =======================================
// UPDATE INFO BOX POSITION ON MOUSE MOVE
// =======================================
document.addEventListener('mousemove', (e) => {
    if (infoBox) {
        infoBox.style.left = (e.clientX + 10) + 'px';
        infoBox.style.top = (e.clientY + 10) + 'px';
    }
});

// =======================================
// INITIALIZE STATUS
// =======================================
updateStatus("Amung GUS ඞ");
