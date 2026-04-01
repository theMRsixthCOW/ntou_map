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
    let bestMatch = null;
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
            bestMatch = b;
        }
    }
    return bestMatch;
}

async function findBuilding(updateUrl = true) {
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

    if (updateUrl) {
        const url = new URL(window.location);
        url.searchParams.set('fname', query);
        window.history.pushState({}, '', url);
    }
    
    const match = await findSimilarBuilding(query);
    
    if (match) {
        document.getElementById('lat-input').value = match.lat;
        document.getElementById('lng-input').value = match.lon;
        
        console.log("Start Building Found:", match.name_ch || match.name);
        
        if (typeof map !== 'undefined') {
            map.flyTo({ center: [match.lon, match.lat], zoom: 18 });
            
            new maplibregl.Popup()
                .setLngLat([match.lon, match.lat])
                .setHTML(`<strong>起始地 (Start)</strong><br>${match.name_ch}<br>${match.name}`)
                .addTo(map);
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
        if (map.getSource('route')) {
            map.removeSource('route');
        }
    }
}

async function findRoute() {
    // 1. Clear any existing route line from the map
    clearMapRoute();

    // 2. Close any map pop-out windows (popups) currently open
    const popups = document.querySelectorAll('.maplibregl-popup');
    popups.forEach(popup => popup.remove());


    const destInput = document.getElementById('destination');
    if (!destInput) return;
    const query = destInput.value;
    
    if (!query) {
        if (document.getElementById('lat-destination')) document.getElementById('lat-destination').value = "";
        if (document.getElementById('lng-destination')) document.getElementById('lng-destination').value = "";
        return;
    }

    const match = await findSimilarBuilding(query);
    
    if (match) {
        document.getElementById('lat-destination').value = match.lat;
        document.getElementById('lng-destination').value = match.lon;
        
        console.log("Destination Building Found:", match.name_ch || match.name);
        
        const startLat = document.getElementById('lat-input').value;
        const startLng = document.getElementById('lng-input').value;

        if (typeof map !== 'undefined') {
            new maplibregl.Popup()
                .setLngLat([match.lon, match.lat])
                .setHTML(`<strong>目的地 (Destination)</strong><br>${match.name_ch}<br>${match.name}`)
                .addTo(map);
            
            if (startLat && startLng) {
                // Have both start and destination, fly to fit bounds and getRoute
                const p1 = [parseFloat(startLng), parseFloat(startLat)];
                const p2 = [match.lon, match.lat];
                
                const bounds = new maplibregl.LngLatBounds(p1, p2);
                map.fitBounds(bounds, { padding: 50 });
                
                if (typeof getRoute === 'function') {
                    // getRoute expects an array of "lng,lat" strings
                    getRoute([`${p1[0]},${p1[1]}`, `${p2[0]},${p2[1]}`]);
                }
            } else {
                map.flyTo({ center: [match.lon, match.lat], zoom: 18 });
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