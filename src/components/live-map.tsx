import { useEffect, useRef } from "react";
import type { ComponentType } from "react";
import { StyleSheet, View } from "react-native";
import { WebView as RNWebView } from "react-native-webview";

const WebView = RNWebView as unknown as ComponentType<any>;

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color: string;
};

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
<script>
  var map = L.map('map').setView([-6.2, 106.8], 12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  var layer = L.layerGroup().addTo(map);
  var lastCount = -1;

  function updateMarkers(list) {
    layer.clearLayers();
    var pts = [];
    list.forEach(function (m) {
      var el = document.createElement('span');
      el.textContent = m.label;
      L.circleMarker([m.lat, m.lng], {
        radius: 10,
        color: '#ffffff',
        weight: 3,
        fillColor: m.color,
        fillOpacity: 1
      })
        .bindTooltip(el, { permanent: true, direction: 'top', offset: [0, -8] })
        .addTo(layer);
      pts.push([m.lat, m.lng]);
    });
    if (pts.length && list.length !== lastCount) {
      map.fitBounds(pts, { padding: [40, 40], maxZoom: 17 });
    }
    lastCount = list.length;
  }
</script>
</body>
</html>`;

export function LiveMap({
  markers,
  height = 260,
}: {
  markers: MapMarker[];
  height?: number;
}) {
  const ref = useRef<any>(null);
  const ready = useRef(false);
  const json = JSON.stringify(markers);

  function push(data: string) {
    ref.current?.injectJavaScript("updateMarkers(" + data + "); true;");
  }

  useEffect(() => {
    if (ready.current) push(json);
  }, [json]);

  return (
    <View style={[styles.box, { height }]}>
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{
          html: HTML,
          baseUrl: "https://github.com/botak721/Aplikasi-PertamaKu",
        }}
        javaScriptEnabled
        nestedScrollEnabled
        onLoadEnd={() => {
          ready.current = true;
          push(json);
        }}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
    marginTop: 10,
  },
  web: { flex: 1 },
});
