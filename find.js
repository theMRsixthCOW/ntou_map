let buildingsData = null;

async function getBuildings() {
    if (!buildingsData) {
        try {
            const res = await fetch('data.json');
            buildingsData = await res.json();
        } catch (e) {
            console.error("Error loading buildings data:", e);
            buildingsData = [];
        }
    }
    return buildingsData;
}

// ── Locate User via Geolocation API (Plain logic for mobile) ──
function locateUser() {
    if (!navigator.geolocation) {
        alert('您的瀏覽器不支援定位功能 (Geolocation not supported)');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            const fnameInput = document.getElementById('fname');
            if (fnameInput) fnameInput.value = '我的位置';

            document.getElementById('lat-input').value = lat;
            document.getElementById('lng-input').value = lng;

            if (typeof map !== 'undefined') {
                map.flyTo({ center: [lng, lat], zoom: 17 });
                new maplibregl.Marker()
                    .setLngLat([lng, lat])
                    .addTo(map);
            }
        },
        (error) => {
            alert('定位失敗 (Location error)');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

function calculateSimilarity(str1, str2) {
    str1 = (str1 || '').toString().toLowerCase().trim();
    str2 = (str2 || '').toString().toLowerCase().trim();
    if (!str1 || !str2) return 0;
    
    if (str1 === str2) return 100;
    if (str1.startsWith(str2)) return 80;
    if (str1.includes(str2)) {
        return 50 + (str2.length / str1.length) * 20; 
    }
    return 0;
}

async function findSimilarBuilding(query) {
    const buildings = await getBuildings();
    let bestMatches = [];
    let maxScore = -1;

    // Fields to compare: "number" or "name" or "name_ch" or "code_id" or "location_code"
    for (const b of buildings) {
        const score = Math.max(
            calculateSimilarity(b.number, query),
            calculateSimilarity(b.name, query),
            calculateSimilarity(b.name_ch, query),
            calculateSimilarity(b.code_id, query),
            calculateSimilarity(b.location_code, query)
        );

        if (score > maxScore && score > 0) {
            maxScore = score;
            bestMatches = [b];
        } else if (score === maxScore && score > 0) {
            bestMatches.push(b);
        }
    }
    return bestMatches;
}

async function findBuilding(updateUrl = true) {

    clearMapRoute();
    // Clear any existing route from the map when searching for a new start building
    if (typeof clearMapRoute === 'function') clearMapRoute();

    const fnameInput = document.getElementById('fname');
    if (!fnameInput) return;
    const query = fnameInput.value;
    
    if (!query) {
        document.getElementById('lat-input').value = "";
        document.getElementById('lng-input').value = "";
        return;
    }

    // Close any map pop-out windows (popups) currently open before making a new start popup
    const popups = document.querySelectorAll('.maplibregl-popup');
    popups.forEach(popup => popup.remove());

    if (updateUrl) {
        try {
            const url = new URL(window.location);
            url.searchParams.set('fname', query);
            window.history.pushState({}, '', url);
        } catch (e) {
            console.warn('pushState failed, likely due to file:// protocol', e);
        }
    }
    
    const matches = await findSimilarBuilding(query);
    
    if (matches && matches.length > 0) {
        const match = matches[0];
        document.getElementById('lat-input').value = match.lat;
        document.getElementById('lng-input').value = match.lon;
        
        console.log("Start Building Found:", match.name_ch || match.name);
        
        if (typeof map !== 'undefined') {
            if (matches.length === 1) {
                map.flyTo({ center: [match.lon, match.lat], zoom: 18 });
            } else {
                const bounds = new maplibregl.LngLatBounds();
                matches.forEach(m => bounds.extend([m.lon, m.lat]));
                map.fitBounds(bounds, { padding: 50 });
            }
            
            matches.forEach(m => {
                new maplibregl.Popup()
                    .setLngLat([m.lon, m.lat])
                    .setHTML(`<strong>起始地 (Start)</strong><br>${m.name_ch}<br>${m.name}`)
                    .addTo(map);
            });
        }
    } else {
        alert("找不到相符的起點建築物 (Start building not found)");
    }
}

function clearRouteInputs() {
    if (document.getElementById('lat-input')) document.getElementById('lat-input').value = "";
    if (document.getElementById('lng-input')) document.getElementById('lng-input').value = "";
    if (document.getElementById('lat-destination')) document.getElementById('lat-destination').value = "";
    if (document.getElementById('lng-destination')) document.getElementById('lng-destination').value = "";
}

function clearMapRoute() {
    if (typeof map !== 'undefined') {
        if (map.getLayer('route-line')) {
            map.removeLayer('route-line');
        }
        if (map.getLayer('route-distance')) {
            map.removeLayer('route-distance');
        }
        if (map.getSource('route')) {
            map.removeSource('route');
        }
    }
}

async function findRoute() {



    const destInput = document.getElementById('destination');
    if (!destInput) return;
    const query = destInput.value;
    
    if (!query) {
        if (document.getElementById('lat-destination')) document.getElementById('lat-destination').value = "";
        if (document.getElementById('lng-destination')) document.getElementById('lng-destination').value = "";
        return;
    }

    const matches = await findSimilarBuilding(query);
    
    if (matches && matches.length > 0) {
        const match = matches[0];
        document.getElementById('lat-destination').value = match.lat;
        document.getElementById('lng-destination').value = match.lon;
        
        console.log("Destination Building Found:", match.name_ch || match.name);
        
        const startLat = document.getElementById('lat-input').value;
        const startLng = document.getElementById('lng-input').value;

        if (typeof map !== 'undefined') {
            matches.forEach(m => {
                new maplibregl.Popup()
                    .setLngLat([m.lon, m.lat])
                    .setHTML(`<strong>目的地 (Destination)</strong><br>${m.name_ch}<br>${m.name}`)
                    .addTo(map);
            });
            
            if (startLat && startLng) {
                // Show start building popup if fname was filled in
                const fnameQuery = document.getElementById('fname') ? document.getElementById('fname').value : '';
                if (fnameQuery) {
                    const startMatches = await findSimilarBuilding(fnameQuery);
                    if (startMatches && startMatches.length > 0) {
                        startMatches.forEach(m => {
                            new maplibregl.Popup()
                                .setLngLat([m.lon, m.lat])
                                .setHTML(`<strong>起始地 (Start)</strong><br>${m.name_ch}<br>${m.name}`)
                                .addTo(map);
                        });
                    }
                }

                // Have both start and destination, fly to fit bounds and getRoute
                const p1 = [parseFloat(startLng), parseFloat(startLat)];
                const p2 = [match.lon, match.lat];
                
                const bounds = new maplibregl.LngLatBounds();
                bounds.extend(p1);
                matches.forEach(m => bounds.extend([m.lon, m.lat]));
                map.fitBounds(bounds, { padding: 50 });
                
                if (typeof getRoute === 'function') {
                    // getRoute expects an array of "lng,lat" strings
                    getRoute([`${p1[0]},${p1[1]}`, `${p2[0]},${p2[1]}`]);
                }
            } else {
                if (matches.length === 1) {
                    map.flyTo({ center: [match.lon, match.lat], zoom: 18 });
                } else {
                    const bounds = new maplibregl.LngLatBounds();
                    matches.forEach(m => bounds.extend([m.lon, m.lat]));
                    map.fitBounds(bounds, { padding: 50 });
                }
            }
        }
    } else {
        alert("找不到相符的目的地建築物 (Destination building not found)");
    }
}

// Check URL for fname on page load
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const fname = params.get('fname');
    if (fname) {
        const fnameInput = document.getElementById('fname');
        if (fnameInput) {
            fnameInput.value = fname;
            // Execute findBuilding without pushing state again
            // Delay slightly so the map can finish drawing styles
            setTimeout(() => {
                findBuilding(false);
            }, 500);
        }
    }
});

// ── Building click handlers (called from index.html on map load) ──

// Helper: fill destination input with the building name when "Go here" is clicked
function goToBuilding(buildingNumber) {
    if (!buildingsData) return;
    const b = buildingsData.find(item => item.number === buildingNumber);
    if (b) {
        const destInput = document.getElementById('destination');
        if (destInput) {
            destInput.value = b.name_ch || b.name;
            findRoute();
        }
    }
}

function initBuildingClickHandlers(map) {
    // Flag: when a 3D building is clicked, skip the generic popup
    let buildingClicked = false;

    // Generic click — show lat/lng (unless a building was just clicked)
    map.on('click', (e) => {
        if (buildingClicked) {
            buildingClicked = false;
            return;
        }
        const { lng, lat } = e.lngLat;
        console.log(`Location Coordinates: Lng: ${lng}, Lat: ${lat}`);

        new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}`)
            .addTo(map);
    });

    // Click on a 3D building → show name / name_ch / code_id from data.json
    map.on('click', '3d-buildings', async (e) => {
        buildingClicked = true;
        const clickedLng = e.lngLat.lng;
        const clickedLat = e.lngLat.lat;

        const buildings = await getBuildings();
        let closest = null;
        let minDist = Infinity;

        for (const b of buildings) {
            const dist = Math.sqrt(
                Math.pow(b.lat - clickedLat, 2) +
                Math.pow(b.lon - clickedLng, 2)
            );
            if (dist < minDist) {
                minDist = dist;
                closest = b;
            }
        }

        // ~0.00025 degrees ≈ roughly 25 m — only match nearby buildings
        if (closest && minDist < 0.00025) {
            new maplibregl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(
                    `<strong>${closest.name}</strong><br>` +
                    `${closest.name_ch}<br>` +
                    `Code: ${closest.code_id || 'N/A'}<br>` +
                    `<button onclick="goToBuilding('${closest.number}')">Go here</button>`
                )
                .addTo(map);
        } else {
            // Clicked a 3D building not in data.json — fall through to generic popup
            buildingClicked = false;
        }
    });
}