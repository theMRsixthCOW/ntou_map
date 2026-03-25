import json
import xml.etree.ElementTree as ET
import os
import re

def normalize(s):
    if not s:
        return ""
    # Keep only alphanumeric and Chinese characters
    s = re.sub(r'[^\w\u4e00-\u9fff]+', '', s)
    return s.lower()

def update_coordinates():
    osm_path = 'map.osm'
    json_path = 'data.json'

    if not os.path.exists(osm_path):
        print(f"Error: {osm_path} not found.")
        return
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return

    print(f"Parsing {osm_path}...")
    tree = ET.parse(osm_path)
    root = tree.getroot()

    nodes = {}
    for node in root.findall('node'):
        node_id = node.get('id')
        lat = float(node.get('lat'))
        lon = float(node.get('lon'))
        nodes[node_id] = (lat, lon)

    osm_data = []

    def add_osm_item(lat, lon, tags):
        osm_data.append({
            'lat': lat,
            'lon': lon,
            'name': tags.get('name'),
            'name_zh': tags.get('name:zh'),
            'name_en': tags.get('name:en'),
            'ref': tags.get('ref'),
            'short_name': tags.get('short_name'),
            'norm_name': normalize(tags.get('name')),
            'norm_name_zh': normalize(tags.get('name:zh')),
            'norm_name_en': normalize(tags.get('name:en')),
            'norm_ref': normalize(tags.get('ref')),
            'norm_short': normalize(tags.get('short_name'))
        })

    # Process nodes with name tags
    for node in root.findall('node'):
        tags = {tag.get('k'): tag.get('v') for tag in node.findall('tag')}
        if 'name' in tags or 'name:zh' in tags or 'name:en' in tags:
            add_osm_item(float(node.get('lat')), float(node.get('lon')), tags)

    # Process ways
    for way in root.findall('way'):
        tags = {tag.get('k'): tag.get('v') for tag in way.findall('tag')}
        if 'building' in tags or 'name' in tags:
            # Calculate center
            way_nodes = [nodes[nd.get('ref')] for nd in way.findall('nd') if nd.get('ref') in nodes]
            if way_nodes:
                avg_lat = sum(n[0] for n in way_nodes) / len(way_nodes)
                avg_lon = sum(n[1] for n in way_nodes) / len(way_nodes)
                add_osm_item(avg_lat, avg_lon, tags)

    print(f"Extracted {len(osm_data)} named features from OSM.")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Manual Mapping
    MAPPING = {
        "圖書館": "圖書",
        "會議中心(海洋廳)": "會議中心",
        "食品科學系館": "食品科學學系館",
        "食品科學系工程館": "食品工程館",
        "男生第一宿舍": "男一舍",
        "女生第一宿舍": "女一舍",
        "男生第二宿舍": "男二舍",
        "女生第二宿舍及男生第三宿舍": "男三女二舍",
        "海洋工程綜合實驗館": "海洋工程綜合試驗館",
        "大型空蝕水槽試驗館": "大型空蝕水槽實驗室",
        "環資系館": "海洋環境資訊系系館",
        "資工系及電機二館": "電機二館",
        "商船學系館": "商船學系系館",
        "水生動物實驗中心館": "水生動物實驗中心",
        "育樂館": "育樂館",
        "工學院館": "工學院",
        "機械與機電工程二館及電算中心": "機械B館和圖資處",
        "變電站": "變電所",
        "郵局, 校史室": "海洋大學郵局",
        "機械與機電工程一館": "機械一館",
        "河工一館": "河工一館",
        "應用經濟研究所館": "應用經濟研究所",
        "臨海生物教學實驗場": "生物教學實驗場"
    }
    
    NORM_MAPPING = {normalize(k): normalize(v) for k, v in MAPPING.items()}

    matched_count = 0
    total_count = len(data)

    for entry in data:
        name_ch = entry.get('name_ch')
        name_en = entry.get('name')
        code_id = entry.get('code_id')
        
        norm_ch = normalize(name_ch)
        norm_en = normalize(name_en)
        norm_code = normalize(code_id)

        target_osm = NORM_MAPPING.get(norm_ch) or NORM_MAPPING.get(norm_en) or NORM_MAPPING.get(norm_code)

        match = None
        # Exact/Mapping match
        for osm in osm_data:
            if target_osm and (osm['norm_name'] == target_osm or osm['norm_name_zh'] == target_osm or target_osm in osm['norm_name']):
                match = osm
                break
            if norm_ch and (osm['norm_name'] == norm_ch or osm['norm_name_zh'] == norm_ch):
                match = osm
                break
            if norm_en and (osm['norm_name'] == norm_en or osm['norm_name_en'] == norm_en):
                match = osm
                break
            if norm_code and (osm['norm_ref'] == norm_code or osm['norm_short'] == norm_code):
                match = osm
                break
                
        if not match:
            # Broad fuzzy match (substring)
            for osm in osm_data:
                if norm_ch and len(norm_ch) > 1 and osm['norm_name'] and (norm_ch in osm['norm_name'] or osm['norm_name'] in norm_ch):
                    match = osm
                    break
                if norm_en and len(norm_en) > 3 and osm['norm_name'] and (norm_en in osm['norm_name'] or osm['norm_name'] in norm_en):
                    match = osm
                    break

        if match:
            entry['lat'] = round(match['lat'], 7)
            entry['lon'] = round(match['lon'], 7)
            matched_count += 1
        else:
            print(f"Remaining failed match: {name_ch} ({name_en}) [{code_id}]")

    print(f"Final Count: Matched {matched_count} out of {total_count} buildings.")

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Update complete.")

if __name__ == "__main__":
    update_coordinates()
