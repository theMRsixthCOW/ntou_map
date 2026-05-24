let buildingsData = null;
let professorsData = null;

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

async function getProfessors() {
    if (!professorsData) {
        try {
            const res = await fetch('professors.json');
            professorsData = await res.json();
        } catch (e) {
            console.error("Error loading professors data:", e);
            professorsData = [];
        }
    }
    return professorsData;
}

// ── Locate User via Geolocation API (Plain logic for mobile) ──
function locateUser() {
    // 1. Check if geolocation is supported (and if we are in a secure context like HTTPS)
    if (!navigator.geolocation) {
        alert(window.currentLang === 'en' 
            ? 'Geolocation not supported or not on HTTPS' 
            : '您的瀏覽器不支援定位功能，或者您當前未使用 HTTPS 連線 (Geolocation not supported or not on HTTPS)');
        return;
    }

    const handleSuccess = (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const fnameInput = document.getElementById('fname');
        if (fnameInput) {
            fnameInput.value = window.currentLang === 'en' ? 'My Location' : '我的位置';
            // Trigger input event to ensure the smooth Chyron placeholder hides
            fnameInput.dispatchEvent(new Event('input'));
        }

        document.getElementById('lat-input').value = lat;
        document.getElementById('lng-input').value = lng;

        if (typeof map !== 'undefined') {
            map.flyTo({ center: [lng, lat], zoom: 17 });
            new maplibregl.Marker()
                .setLngLat([lng, lat])
                .addTo(map);
        }
    };

    const handleError = (error) => {
        // Provide detailed error feedback
        let errorMsg = window.currentLang === 'en' ? 'Location error' : '定位失敗 (Location error)';
        if (error.code === 1) errorMsg = window.currentLang === 'en' 
            ? 'Permission denied. If on iOS, go to Settings > Safari > Location and allow.' 
            : '定位失敗：請允許瀏覽器存取您的位置權限 (Permission denied)\\n(如果是 iOS，請至 設定 > Safari > 位置，改為「允許」)';
        if (error.code === 2) errorMsg = window.currentLang === 'en' 
            ? 'Position unavailable. Please ensure GPS is turned on.' 
            : '定位失敗：無法獲取位置資訊，請確認手機 GPS 已開啟 (Position unavailable)';
        if (error.code === 3) errorMsg = window.currentLang === 'en' 
            ? 'Timeout while getting location.' 
            : '定位失敗：獲取位置超時 (Timeout)';
        alert(errorMsg);
    };

    // iOS Safari often fails/times out with high accuracy indoors.
    // Try high accuracy first, fallback to low accuracy if it fails.
    navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (error) => {
            if (error.code === 2 || error.code === 3) {
                console.warn("High accuracy geolocation failed. Falling back to low accuracy...");
                navigator.geolocation.getCurrentPosition(
                    handleSuccess,
                    handleError,
                    { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                );
            } else {
                handleError(error);
            }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
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
    const professors = await getProfessors();
    let bestMatches = [];
    let maxScore = -1;

    // Search for professors first
    let bestProfMatch = null;
    let profMaxScore = -1;

    for (const p of professors) {
        let score = calculateSimilarity(p.name, query);
        if (p.name_EN) {
            score = Math.max(score, calculateSimilarity(p.name_EN, query));
        }
        if (score > profMaxScore && score > 0) {
            profMaxScore = score;
            bestProfMatch = p;
        }
    }

    if (bestProfMatch && profMaxScore >= 80) {
        const bldgCode = (bestProfMatch.office || '').split(' ')[0];
        if (bldgCode) {
            // Find building that matches the code exactly
            for (const b of buildings) {
                if (b.code_id && b.code_id.toLowerCase() === bldgCode.toLowerCase()) {
                    const bMatch = { ...b, professorMatched: bestProfMatch };
                    return [bMatch];
                }
            }
            // Also try matching against name or name_ch if code_id didn't match directly
            for (const b of buildings) {
                if (calculateSimilarity(b.name, bldgCode) >= 80 || calculateSimilarity(b.name_ch, bldgCode) >= 80) {
                    const bMatch = { ...b, professorMatched: bestProfMatch };
                    return [bMatch];
                }
            }
        }
    }

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

// --- Point-in-polygon helper functions ---
function isPointInPolygon(point, polygon) {
    const x = point[0], y = point[1];
    let inside = false;
    const ring = polygon[0]; // Outer ring
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function getBuildingFeatureFromPoint(lng, lat) {
    const features = map.queryRenderedFeatures({ layers: ['3d-buildings'] });
    let closestFeature = null;
    let closestPolygon = null;
    let minDistance = Infinity;
    const point = [lng, lat];

    for (const f of features) {
        if (!f.geometry) continue;
        
        let polygons = [];
        if (f.geometry.type === 'Polygon') {
            polygons.push(f.geometry.coordinates);
        } else if (f.geometry.type === 'MultiPolygon') {
            polygons = f.geometry.coordinates;
        }
        
        for (const poly of polygons) {
            if (isPointInPolygon(point, poly)) {
                return { feature: f, polygon: { type: 'Polygon', coordinates: poly } };
            }
            
            if (poly[0] && poly[0][0]) {
                const firstPoint = poly[0][0];
                const dist = Math.hypot(firstPoint[0] - point[0], firstPoint[1] - point[1]);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestFeature = f;
                    closestPolygon = poly;
                }
            }
        }
    }
    
    if (closestFeature && closestPolygon) {
        return { feature: closestFeature, polygon: { type: 'Polygon', coordinates: closestPolygon } };
    }
    return null;
}

// --- Highlight State Store ---
window.highlightedFeaturesStore = {};

// Ensure layer is initialized when the map loads
let highlightRefreshAttached = false;

if (typeof map !== 'undefined') {
    if (map.isStyleLoaded()) {
        initHighlightLayer();
    } else {
        map.on('style.load', initHighlightLayer);
    }
}

function refreshHighlights() {
    if (typeof map === 'undefined' || !map.isStyleLoaded()) return;
    
    let updated = false;
    for (const key in window.highlightedFeaturesStore) {
        const [lngStr, latStr] = key.split(',');
        const lng = parseFloat(lngStr);
        const lat = parseFloat(latStr);
        
        const match = getBuildingFeatureFromPoint(lng, lat);
        if (match) {
            window.highlightedFeaturesStore[key].geometry = match.polygon;
            updated = true;
        }
    }
    
    if (updated && map.getSource('highlighted-buildings-source')) {
        map.getSource('highlighted-buildings-source').setData({
            type: 'FeatureCollection',
            features: Object.values(window.highlightedFeaturesStore)
        });
    }
}

function initHighlightLayer() {
    if (typeof map === 'undefined') return;
    if (map.getSource('highlighted-buildings-source')) return;

    map.addSource('highlighted-buildings-source', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    map.addLayer({
        id: 'highlighted-buildings-layer',
        type: 'fill-extrusion',
        source: 'highlighted-buildings-source',
        paint: {
            'fill-extrusion-color': ['get', 'color'],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'base_height'],
            'fill-extrusion-opacity': 0.95
        }
    });
    
    if (!highlightRefreshAttached) {
        map.on('moveend', refreshHighlights);
        highlightRefreshAttached = true;
    }
}

// --- Main Highlight & Clear APIs ---
function clearHighlightedBuildings() {
    window.highlightedFeaturesStore = {};
    if (typeof map !== 'undefined' && map.getSource('highlighted-buildings-source')) {
        map.getSource('highlighted-buildings-source').setData({
            type: 'FeatureCollection',
            features: []
        });
    }
}

function highlightBuildingAt(lng, lat, color = '#FFD700') {
    if (typeof map === 'undefined') return;
    
    // Make sure overlay source/layer is initialized
    initHighlightLayer();

    // Wait for camera movement to end before querying features
    map.once('moveend', () => {
        setTimeout(() => {
            const match = getBuildingFeatureFromPoint(lng, lat);
            
            if (match) {
                const f = match.feature;
                const targetPolygon = match.polygon;
                
                const key = `${lng.toFixed(6)},${lat.toFixed(6)}`;
                window.highlightedFeaturesStore[key] = {
                    type: 'Feature',
                    properties: {
                        color: color,
                        height: (f.properties.render_height || 5) + 1, // Add +1 height to prevent flickering Z-fighting
                        base_height: f.properties.render_min_height || 0
                    },
                    geometry: targetPolygon
                };
                
                const geojson = {
                    type: 'FeatureCollection',
                    features: Object.values(window.highlightedFeaturesStore)
                };
                map.getSource('highlighted-buildings-source').setData(geojson);
            }
        }, 150);
    });
}

async function findBuilding(updateUrl = true) {

    clearMapRoute();
    clearHighlightedBuildings();
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
            
            highlightBuildingAt(match.lon, match.lat, '#ffad33ff'); // Highlight only the primary start building in Orange
            
            matches.forEach(m => {
                const startLabel = window.currentLang === 'en' ? 'Start' : '起始地 (Start)';
                let popupHtml = `<strong>${startLabel}</strong><br>${window.currentLang === 'en' ? m.name : m.name_ch}<br>${window.currentLang === 'en' ? m.name_ch : m.name}`;
                if (m.professorMatched) {
                    const profLabel = window.currentLang === 'en' ? 'Professor' : '教授 (Professor)';
                    const officeLabel = window.currentLang === 'en' ? 'Office' : '辦公室 (Office)';
                    const dispName = window.currentLang === 'en' && m.professorMatched.name_EN ? m.professorMatched.name_EN : m.professorMatched.name;
                    popupHtml += `<br><br><strong>${profLabel}: ${dispName}</strong><br>${officeLabel}: ${m.professorMatched.office}`;
                }
                new maplibregl.Popup()
                    .setLngLat([m.lon, m.lat])
                    .setHTML(popupHtml)
                    .addTo(map);
            });
        }
    } else {
        alert(window.currentLang === 'en' ? "Start building not found" : "找不到相符的起點建築物 (Start building not found)");
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
    clearMapRoute();

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
            clearHighlightedBuildings();
            highlightBuildingAt(match.lon, match.lat, '#ffad33ff'); // Highlight only the primary destination building in Orange
            
            matches.forEach(m => {
                const destLabel = window.currentLang === 'en' ? 'Destination' : '目的地 (Destination)';
                let popupHtml = `<strong>${destLabel}</strong><br>${window.currentLang === 'en' ? m.name : m.name_ch}<br>${window.currentLang === 'en' ? m.name_ch : m.name}`;
                if (m.professorMatched) {
                    const profLabel = window.currentLang === 'en' ? 'Professor' : '教授 (Professor)';
                    const officeLabel = window.currentLang === 'en' ? 'Office' : '辦公室 (Office)';
                    const dispName = window.currentLang === 'en' && m.professorMatched.name_EN ? m.professorMatched.name_EN : m.professorMatched.name;
                    popupHtml += `<br><br><strong>${profLabel}: ${dispName}</strong><br>${officeLabel}: ${m.professorMatched.office}`;
                }
                new maplibregl.Popup()
                    .setLngLat([m.lon, m.lat])
                    .setHTML(popupHtml)
                    .addTo(map);
            });
            
            if (startLat && startLng) {
                // Show start building popup if fname was filled in
                const fnameQuery = document.getElementById('fname') ? document.getElementById('fname').value : '';
                const myLocStrZh = '我的位置';
                const myLocStrEn = 'My Location';
                if (fnameQuery && fnameQuery !== myLocStrZh && fnameQuery !== myLocStrEn) {
                    const startMatches = await findSimilarBuilding(fnameQuery);
                    if (startMatches && startMatches.length > 0) {
                        const startMatch = startMatches[0];
                        highlightBuildingAt(startMatch.lon, startMatch.lat, '#ffad33ff'); // Highlight only the primary start building in Orange
                        
                        startMatches.forEach(m => {
                            const startLabel = window.currentLang === 'en' ? 'Start' : '起始地 (Start)';
                            let popupHtml = `<strong>${startLabel}</strong><br>${window.currentLang === 'en' ? m.name : m.name_ch}<br>${window.currentLang === 'en' ? m.name_ch : m.name}`;
                            if (m.professorMatched) {
                                const profLabel = window.currentLang === 'en' ? 'Professor' : '教授 (Professor)';
                                const officeLabel = window.currentLang === 'en' ? 'Office' : '辦公室 (Office)';
                                const dispName = window.currentLang === 'en' && m.professorMatched.name_EN ? m.professorMatched.name_EN : m.professorMatched.name;
                                popupHtml += `<br><br><strong>${profLabel}: ${dispName}</strong><br>${officeLabel}: ${m.professorMatched.office}`;
                            }
                            new maplibregl.Popup()
                                .setLngLat([m.lon, m.lat])
                                .setHTML(popupHtml)
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
        alert(window.currentLang === 'en' ? "Destination building not found" : "找不到相符的目的地建築物 (Destination building not found)");
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

// Helper: fill start input with the building name when "Start here" is clicked
function startAtBuilding(buildingNumber) {
    if (!buildingsData) return;
    const b = buildingsData.find(item => item.number === buildingNumber);
    if (b) {
        const fnameInput = document.getElementById('fname');
        if (fnameInput) {
            fnameInput.value = b.name_ch || b.name;
            fnameInput.dispatchEvent(new Event('input')); // Hide chyron
            findBuilding();
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
            const startBtn = window.currentLang === 'en' ? 'Start here' : '從這裡開始';
            const goBtn = window.currentLang === 'en' ? 'Go here' : '到這裡去';
            new maplibregl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(
                    `<strong>${window.currentLang === 'en' ? closest.name : closest.name_ch}</strong><br>` +
                    `${window.currentLang === 'en' ? closest.name_ch : closest.name}<br>` +
                    `Code: ${closest.code_id || 'N/A'}<br>` +
                    `<button onclick="startAtBuilding('${closest.number}')">${startBtn}</button> ` +
                    `<button onclick="goToBuilding('${closest.number}')">${goBtn}</button>`
                )
                .addTo(map);
        } else {
            // Clicked a 3D building not in data.json — fall through to generic popup
            buildingClicked = false;
        }
    });
}

// ── Smooth Chyron Placeholder Visibility ──
document.addEventListener('DOMContentLoaded', () => {
    const fnameInput = document.getElementById('fname');
    const placeholderWrapper = document.getElementById('fname-placeholder-wrapper');
    
    if (fnameInput && placeholderWrapper) {
        // Toggle visibility based on input content
        const togglePlaceholder = () => {
            if (fnameInput.value === '') {
                placeholderWrapper.style.opacity = '1';
                placeholderWrapper.style.visibility = 'visible';
            } else {
                placeholderWrapper.style.opacity = '0';
                placeholderWrapper.style.visibility = 'hidden';
            }
        };

        // Listen for typing or value changes
        fnameInput.addEventListener('input', togglePlaceholder);
        // Ensure correct state on load
        togglePlaceholder();
    }
});

// ── Language Toggle & i18n ──
window.currentLang = 'zh';

const i18n = {
    'ADM or 行政大樓 or 1（地圖上的編號）': {
        en: 'ADM or Admin Bldg or 1 (Map ID)'
    },
    '目的地（例如：圖書館或教授名字）': {
        en: 'Destination (e.g., Library or Professor Name)'
    },
    '聯絡我們': {
        en: 'Contact Us'
    },
    '> 有什麼事嗎？': {
        en: '> How can I help you?'
    },
    '> 請選擇類型：': {
        en: '> Please select a topic:'
    },
    '回報錯誤 / 建議': {
        en: 'Report Bug / Suggestion'
    },
    '我想改造建築物': {
        en: 'I Want to Mod a Building'
    },
    '在這裡輸入你的訊息...': {
        en: 'Enter your message here...'
    },
    '← 返回': {
        en: '← Back'
    },
    '送出 ': {
        en: 'Send '
    }
};

function toggleLanguage() {
    window.currentLang = window.currentLang === 'zh' ? 'en' : 'zh';
    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
        langToggleBtn.innerText = window.currentLang === 'zh' ? 'EN' : '中文';
    }
    updateStaticText();
}

function updateStaticText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = window.currentLang === 'en' ? i18n[key].en : key;
            } else {
                el.innerText = window.currentLang === 'en' ? i18n[key].en : key;
            }
        }
    });
    
    // Also update title attribute for report icon
    const reportIcon = document.querySelector('.report-window-icon');
    if (reportIcon) {
        reportIcon.title = window.currentLang === 'en' ? i18n['聯絡我們'].en : '聯絡我們';
    }
}

// ── Map Initialization & Route ──
var map;

document.addEventListener('DOMContentLoaded', () => {
    const isMobile = window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent);
    // Zooming out by 30% scale means multiplying by ~0.7. 
    // Since 2^(-0.5) is approx 0.7, subtracting 0.5 from zoom level (17 -> 16.5) achieves this.
    const minZoomLimit = isMobile ? 16.0 : 0;

    map = new maplibregl.Map({
        style: `https://tiles.openfreemap.org/styles/bright`,//找中間
        center: [121.77559, 25.14939],               // Fixed: [lng, lat]
        zoom: 17,
        minZoom: minZoomLimit,
        pitch: 45,
        bearing: 45,
        container: 'map',
        antialias: true
    });

    map.on('load', () => {
        map.addLayer({
            'id': '3d-buildings',
            'source': 'openmaptiles', // OpenFreeMap uses 'openmaptiles' as the source ID in their 'bright' style
            'source-layer': 'building',
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': ['get', 'render_height'],
                'fill-extrusion-base': ['get', 'render_min_height'],
                'fill-extrusion-opacity': 0.6
            }
        });

        // Pre-load buildings data and set up click handlers
        getBuildings();
        initBuildingClickHandlers(map);
        
        // Ensure highlight layer gets initialized if it wasn't already
        initHighlightLayer();
    });
});


//        Fetch the OSM Route
async function getRoute(points) {
    const query = points.join(';');
    // Use FOSSGIS foot routing which specifically favors tiny walking paths and footways on campus
    const url = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${query}?geometries=geojson&overview=full`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.routes || data.routes.length === 0) {
            console.error("No route found");
            return;
        }
        const route = data.routes[0].geometry;
        const distance = Math.round(data.routes[0].distance);

        // Update or add the route line to the map
        if (map.getSource('route')) {
            map.getSource('route').setData(route);
            if (map.getLayer('route-distance')) {
                map.setLayoutProperty('route-distance', 'text-field', `${distance} m`);
            }
        } else {
            map.addSource('route', { type: 'geojson', data: route });
            map.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                paint: { 'line-color': '#3887be', 'line-width': 9 }
            });
            map.addLayer({
                id: 'route-distance',
                type: 'symbol',
                source: 'route',
                layout: {
                    'symbol-placement': 'line-center',
                    'text-field': `${distance} m`,
                    'text-size': 14
                },
                paint: {
                    'text-color': '#000',
                    'text-halo-color': '#fff',
                    'text-halo-width': 3
                }
            });
        }
    } catch (e) {
        console.error("Failed to fetch route", e);
    }
}

// --- Google Maps Style Search Suggestion ---

async function getTopSuggestions(query) {
    const buildings = await getBuildings();
    const professors = await getProfessors();
    let results = [];

    const qs = query.toLowerCase().trim();

    // Search for professors
    for (const p of professors) {
        let score = calculateSimilarity(p.name, qs);
        if (p.name_EN) {
            score = Math.max(score, calculateSimilarity(p.name_EN, qs));
        }
        if (score > 0) {
            let bldgCode = (p.office || '').split(' ')[0];
            let matchedBldg = null;
            if (bldgCode) {
                matchedBldg = buildings.find(b => b.code_id && b.code_id.toLowerCase() === bldgCode.toLowerCase());
                if (!matchedBldg) {
                    matchedBldg = buildings.find(b => calculateSimilarity(b.name, bldgCode) >= 80 || calculateSimilarity(b.name_ch, bldgCode) >= 80);
                }
            }
            if (matchedBldg) {
                const dispName = window.currentLang === 'en' && p.name_EN ? p.name_EN : p.name;
                results.push({
                    score: score + 10,
                    type: 'professor',
                    professorMatched: p,
                    label: dispName + ' (' + (window.currentLang === 'en' ? matchedBldg.name : matchedBldg.name_ch) + ')',
                    number: matchedBldg.number,
                    code_id: matchedBldg.code_id,
                    targetName: dispName
                });
            }
        }
    }

    // Search for buildings
    for (const b of buildings) {
        const score = Math.max(
            calculateSimilarity(b.number, qs),
            calculateSimilarity(b.name, qs),
            calculateSimilarity(b.name_ch, qs),
            calculateSimilarity(b.code_id, qs),
            calculateSimilarity(b.location_code, qs)
        );

        if (score > 0) {
            results.push({
                score: score,
                type: 'building',
                label: window.currentLang === 'en' ? b.name : b.name_ch,
                number: b.number,
                code_id: b.code_id,
                targetName: window.currentLang === 'en' ? b.name : b.name_ch
            });
        }
    }

    // sort descending by score
    results.sort((a, b) => b.score - a.score);

    // limit to top 5 unique elements
    const unique = [];
    const seen = new Set();
    for (let r of results) {
        const key = r.type === 'professor' ? `prof_${r.professorMatched.name}` : `bldg_${r.number}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(r);
            if (unique.length >= 5) break; 
        }
    }

    return unique;
}

async function handleSearchInput(inputId) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl) return;
    const query = inputEl.value.trim();
    const suggestionsEl = document.getElementById(inputId + '-suggestions');
    if (!suggestionsEl) return;
    
    if (!query) {
        hideSuggestions(inputId);
        return;
    }

    const matches = await getTopSuggestions(query);
    if (matches.length === 0) {
        hideSuggestions(inputId);
        return;
    }

    suggestionsEl.innerHTML = '';
    matches.forEach(match => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        
        const icon = document.createElement('img');
        icon.src = match.type === 'professor' ? 
            'https://cdn-icons-png.flaticon.com/128/1946/1946429.png' :
            'https://cdn-icons-png.flaticon.com/128/2838/2838912.png';
        icon.className = 'suggestion-icon';

        const textContainer = document.createElement('div');
        textContainer.className = 'suggestion-text';
        
        const mainText = document.createElement('div');
        mainText.className = 'suggestion-main-text';
        mainText.innerText = match.label;
        
        const subText = document.createElement('div');
        subText.className = 'suggestion-sub-text';
        if (match.type === 'professor') {
            subText.innerText = window.currentLang === 'en' ? `Office: ${match.professorMatched.office}` : `辦公室：${match.professorMatched.office}`;
        } else {
            subText.innerText = match.number ? `No. ${match.number} - ${match.code_id || ''}` : `${match.code_id || ''}`;
        }

        textContainer.appendChild(mainText);
        textContainer.appendChild(subText);
        
        item.appendChild(icon);
        item.appendChild(textContainer);

        item.onmousedown = (e) => {
            e.preventDefault();
            inputEl.value = match.targetName;
            hideSuggestions(inputId);
            
            inputEl.dispatchEvent(new Event('input'));

            if (inputId === 'fname') {
                findBuilding();
            } else if (inputId === 'destination') {
                findRoute();
            }
        };

        suggestionsEl.appendChild(item);
    });

    suggestionsEl.style.display = 'flex';
}

function hideSuggestions(inputId) {
    const suggestionsEl = document.getElementById(inputId + '-suggestions');
    if (suggestionsEl) {
        suggestionsEl.style.display = 'none';
    }
}