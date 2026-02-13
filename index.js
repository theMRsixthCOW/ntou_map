const map = new OSMBuildings({
    container: 'map',
    position: { latitude: 25.14937, longitude: 121.77821 },
    zoom: 16.6,
    tilt: 45,
    minZoom: 15,
    maxZoom: 22,
    rotation:0

});

map.addMapTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
map.addGeoJSONTiles('https://{s}.data.osmbuildings.org/0.2/59fcc2e8/tile/{z}/{x}/{y}.json');

// Search functionality
document.getElementById('search-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const query = document.getElementById('fname').value;
    const resultsDiv = document.getElementById('search-results');
    const output1 = document.getElementById('search-output1');
    const output2 = document.getElementById('search-output2');
    
    if (!query.trim()) {
        output1.innerHTML = 'Please enter a search query';
        output2.innerHTML = '';
        return;
    }
    
    console.log('Search:', query);
    
    // Show loading state
    output1.innerHTML = 'Searching...';
    output2.innerHTML = '';
    
    try {
        const result = await sendQuery(query);
        output1.innerHTML = result.building1 || '404 not found';
        output2.innerHTML = result.building2 || '';
        
        // Optional: Display in results div with animation
        resultsDiv.innerHTML = `
            <div class="result-item">
                <strong>Top Match:</strong> ${result.building1}
            </div>
            ${result.building2 ? `<div class="result-item"><strong>Second Match:</strong> ${result.building2}</div>` : ''}
        `;
    } catch (error) {
        console.error('Search error:', error);
        output1.innerHTML = 'Error: Could not fetch results';
        output2.innerHTML = '';
    }
});

async function sendQuery(query) {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
        throw new Error('Search failed');
    }
    const data = await response.json();
    return data;
}
