import * as L from 'leaflet';

export function getMapLayers() {
  // OpenStreetMap Base Layer
  const osmBase = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }
  );

  // OpenSeaMap Overlay
  const openSeaMap = L.tileLayer(
    'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
    {
      attribution:
        'Map data: &copy; <a href="http://www.openseamap.org">OpenSeaMap</a> contributors'
    }
  );

  // Norwegian Hydrographic Service (tiles licensed CC-BY 4.0)
  const kartverketLayer = L.tileLayer(
    'https://cache.kartverket.no/v1/wmts/1.0.0/sjokartraster/default/webmercator/{z}/{y}/{x}.png',
    {
      bounds: [
        [56, -14],
        [82, 38]
      ],
      maxNativeZoom: 16,
      attribution: '© <a href="https://www.kartverket.no/en">Kartverket</a>'
    }
  );

  // NOAA WMS Layer
  const noaaLayer = L.tileLayer.wms(
    'https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/exts/MaritimeChartService/WMSServer',
    {
      bounds: [
        [-20, -230],
        [80, -60]
      ],
      format: 'image/png',
      transparent: true,
      attribution: 'NOAA Office of Coast Survey'
    }
  );

  const baseMaps = {
    OpenStreetMap: osmBase
  };

  const overlayMaps = {
    '🌐 OpenSeaMap': openSeaMap,
    '🇳🇴 Kartverket': kartverketLayer,
    '🇺🇸 NOAA Charts': noaaLayer
  };

  return {
    osmBase,
    openSeaMap,
    kartverketLayer,
    noaaLayer,
    baseMaps,
    overlayMaps
  };
}

export function initMapLayers(map: L.Map) {
  const {
    osmBase,
    openSeaMap,
    kartverketLayer,
    noaaLayer,
    baseMaps,
    overlayMaps
  } = getMapLayers();

  osmBase.addTo(map);
  openSeaMap.addTo(map);
  kartverketLayer.addTo(map);
  noaaLayer.addTo(map);

  L.control.layers(baseMaps, overlayMaps).addTo(map);
}
