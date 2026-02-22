# NTOU 3D Campus Navigation System

The **NTOU 3D Campus Navigation System** is a specialized web-based mapping application designed for the National Taiwan Ocean University (NTOU). It provides an interactive 3D visualization of the campus environment using **Leaflet.js** and **OSM Buildings**, grounded in **OpenStreetMap** data. The user interface is uniquely styled to resemble an industrial equipment specification label, emphasizing a technical and mechanical aesthetic through monospaced typography and a structured grid layout.

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Map Engine** | Leaflet.js | Handles the base map layers and basic interactions. |
| **3D Rendering** | OSM Buildings | Extrudes building geometries for a 2.5D/3D perspective. |
| **Data Format** | JSON | Stores building metadata including names, codes, and coordinates. |
| **UI Design** | CSS3 | Implements the industrial label style with noise textures and mono fonts. |

### Core Functionality

The system features a robust **Fuzzy Search** engine that allows users to locate buildings by their English names, Chinese names, internal code IDs, or map numbers. Once two locations are selected, the application calculates and renders an **Animated Navigation Path**, represented by a glowing white line that draws itself between the start and end points. Users can also interact directly with the map by clicking on 3D buildings to trigger a floating **Building Data Label** that displays technical specifications such as the building code and grid location.

### Implementation and Deployment

To operate the system locally, the project files must be served through a web server to ensure proper loading of the `data.json` file. Users can utilize the **Live Server** extension in VS Code or execute a simple command like `python3 -m http.server 8000` in their terminal. For public access, the project is fully compatible with **GitHub Pages**. By uploading the `index.html`, `style.css`, `script.js`, and `data.json` files to a GitHub repository and enabling the Pages feature in the settings, the navigation system can be deployed globally without the need for a backend server.

### References

The development of this system relies on several open-source resources and university-provided data. The primary technical documentation includes the [OSM Buildings API](https://osmbuildings.org/documentation/) and the [Leaflet.js Documentation](https://leafletjs.com/reference.html). Campus building data was cross-referenced with the official [NTOU Campus Map](https://ga.ntou.edu.tw/var/file/15/1015/img/651669172.pdf) to ensure accuracy in building names and grid locations.
