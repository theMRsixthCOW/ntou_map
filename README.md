<div align="center">
  <img src="logo.png" alt="NTOU 3D Campus Navigation System Logo" width="200" />
</div>

<h1 align="center">NTOU 3D Campus Navigation System</h1>

The NTOU 3D Campus Navigation System is a web-based mapping application built for the National Taiwan Ocean University. It renders the campus environment in 3D using Leaflet.js and OSM Buildings, based on OpenStreetMap data. The user interface features an industrial design language with monospaced typography and structured layouts.

## Features

- **3D Visualization:** Extruded building geometries for accurate spatial representation.
- **Pathfinding Navigation:** Automated routing between user-selected coordinates, rendered as animated vectors.
- **Fuzzy Search Functionality:** Query campus locations via English names, Chinese names, internal codes, or grid numbers.
- **Interactive Building Labels:** Floating data panels displaying technical specifications upon building selection.
- **User Reporting System:** Integrated Supabase backend to handle error reporting and database modification requests.

## Architecture

| Component | Technology | Description |
| :--- | :--- | :--- |
| Core Map Engine | Leaflet.js | Manages base map layers, tiles, and user interactions. |
| 3D Rendering | OSM Buildings | Handles 2.5D geometry extrusion and perspective generation. |
| Metadata Storage | JSON | Local `data.json` containing building definitions and coordinates. |
| Backend API | Supabase | Handles POST requests for the built-in report submission system. |

## Installation and Setup

This application can be run entirely in the browser but requires a local development server to parse the `data.json` file due to CORS policies.

### Prerequisites

- Git
- Node.js (for serving files locally via npx) or Python

### Local Development

1. Clone the repository to your local machine.
   ```bash
   git clone https://github.com/your-username/ntou_map.git
   cd ntou_map
   ```

2. Start a local server. You can use standard Python or Node.js utilities.
   ```bash
   # Using Node.js
   npx serve . -p 3000

   # Or using Python 3
   python -m http.server 3000
   ```

3. Access the application by navigating to `http://localhost:3000` in your web browser.

### Supabase Setup (Reporting System)

To enable the user reporting system, you must configure a Supabase project:

1. Create a new project on [Supabase](https://supabase.com/).
2. Under **Table Editor**, create a new table named **`report`** with your desired columns (e.g., `type`, `message`, `time`).
3. Under **Project Settings -> API**, copy your **Project URL** and the **`anon / public` API key** (this is a long JWT string starting with `eyJ`).
4. Paste these into the `SUPABASE_CONFIG` object at the top of `eye_window.js`.
5. Finally, navigate to **Authentication -> Policies** (or Database -> Policies), find the `report` table, and click **Create policy**. Choose the **"Enable insert access for anonymous users"** template (ensuring the target role is set to `anon`) and save it. This is mandatory; otherwise, Supabase will block submissions with a `401 Unauthorized` Row-Level Security error.

## Usage Guide

### 1. Navigating the Map
Click and drag to pan across the campus. Scroll to adjust the zoom level. The 3D buildings will render dynamically based on your viewport. Click on any building geometry to pull up its corresponding data label.

<div align="center">
  <!-- Note: Replace the placeholder URL with an actual screenshot of the map interface -->
  <img src="https://via.placeholder.com/800x400?text=Map+Navigation+Screenshot" alt="Map Navigation Interface" width="100%" />
</div>

### 2. Finding a Route
Use the search fields in the top console to input a starting location and a destination. The system's fuzzy search will automatically suggest matches from the database. Once confirmed, the routing engine calculates and animates the optimal path.

<div align="center">
  <!-- Note: Replace the placeholder URL with an actual screenshot of the routing interface -->
  <img src="https://via.placeholder.com/800x400?text=Routing+and+Search+Screenshot" alt="Search and Routing Interface" width="100%" />
</div>

### 3. Submitting a Report
If you encounter missing data or structural inaccuracies, use the report tool. Ensure you have properly configured the Supabase keys in `eye_window.js`.
Click the report button to open the submission window. Select your issue category, input the details, and finalize the submission.

<div align="center">
  <img src="report.png" alt="Reporting Window Interface" width="100%" />
</div>

## Deployment

The application is static and can be hosted via GitHub Pages, Cloudflare Pages, or Vercel. 
Ensure `data.json` is located in the root directory relative to `index.html`. For Cloudflare deployments, use the provided `wrangler.jsonc` configuration.

## Data Sources and References

- Base mapping and extrusion logic relies on OpenStreetMap data.
- System rendering powered by [OSM Buildings API](https://osmbuildings.org/documentation/) and [Leaflet.js](https://leafletjs.com/reference.html).
- Building aliases and grid designations cross-referenced with the official NTOU physical campus map.