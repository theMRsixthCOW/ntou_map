const fs = require('fs');

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} s1 - First string
 * @param {string} s2 - Second string
 * @returns {number} The Levenshtein distance
 */
function levenshtein(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

    // Initialize first column
    for (let i = 0; i <= len1; i++) {
        matrix[i][0] = i;
    }

    // Initialize first row
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    // Calculate distances
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1].toLowerCase() === s2[j - 1].toLowerCase() ? 0 : 1;
            const deletion = matrix[i - 1][j] + 1;
            const insertion = matrix[i][j - 1] + 1;
            const substitution = matrix[i - 1][j - 1] + cost;
            
            matrix[i][j] = Math.min(deletion, insertion, substitution);
        }
    }

    return matrix[len1][len2];
}

/**
 * Load data from JSON file
 * @param {string} filename - Path to JSON file
 * @returns {Array} Array of records
 */
function loadData(filename) {
    try {
        const data = fs.readFileSync(filename, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading file:', error);
        return [];
    }
}

/**
 * Find the top 2 most similar building names
 * @param {string} query - User's search query
 */
function findSimilarBuildings(query) {
    const records = loadData('data.json');

    if (records.length === 0) {
        console.log('[]');
        return;
    }

    const bestScores = [9999, 9999];
    const bestIndices = [-1, -1];

    for (let i = 0; i < records.length; i++) {
        // Calculate distance for English name, Chinese name, and code_id
        const dist_en = levenshtein(query, records[i].name);
        const dist_ch = levenshtein(query, records[i].name_ch);
        const dist_code = levenshtein(query, records[i].code_id);
        
        // Use the minimum distance among all three fields
        const score = Math.min(dist_en, dist_ch, dist_code);

        if (score < bestScores[0]) {
            bestScores[1] = bestScores[0];
            bestIndices[1] = bestIndices[0];
            bestScores[0] = score;
            bestIndices[0] = i;
        } else if (score < bestScores[1]) {
            bestScores[1] = score;
            bestIndices[1] = i;
        }
    }

    // Build result array
    const results = [];
    if (bestIndices[0] !== -1) {
        results.push({
            name_ch: records[bestIndices[0]].name_ch,
            code_ID: records[bestIndices[0]].code_id
        });
    }
    if (bestIndices[1] !== -1) {
        results.push({
            name_ch: records[bestIndices[1]].name_ch,
            code_ID: records[bestIndices[1]].code_id
        });
    }

    // Output as JSON
    console.log(JSON.stringify(results));
}

// Main execution
if (process.argv.length < 3) {
    console.log('[]');
    process.exit(0);
}

const query = process.argv[2];
findSimilarBuildings(query);
