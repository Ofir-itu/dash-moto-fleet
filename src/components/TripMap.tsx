import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type TripEventMarker = { lat: number; lng: number; label: string; time: string };

type Props = {
  path: [number, number][];
  events?: TripEventMarker[];
  className?: string;
};

const pin = (color: string, ring: string) =>
  L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<div style="width:26px;height:26px;border-radius:9999px;background:${ring};display:grid;place-items:center">
      <div style="width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid #091835"></div>
    </div>`,
  });

const eventIcon = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<div style="width:22px;height:22px;border-radius:9999px;background:#e0322f;border:2px solid #fff;color:#fff;font:700 13px/18px system-ui;text-align:center">!</div>`,
});

/** Trip route map: blue polyline, green start pin, red end pin, red sensor-event markers. */
export default function TripMap({ path, events = [], className }: Props) {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: false }).setView(
      path[0] ?? [-23.5613, -46.6565],
      14,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      errorTileUrl:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#dfe9ee"/></svg>',
        ),
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      layer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g || path.length === 0) return;
    g.clearLayers();

    const line = L.polyline(path, { color: "#00529B", weight: 5, opacity: 0.95 }).addTo(g);
    const start = path[0]!;
    const end = path[path.length - 1]!;
    L.marker(start, { icon: pin("#84C42B", "rgba(132,196,43,0.3)") })
      .bindTooltip("Início do trajeto")
      .addTo(g);
    L.marker(end, { icon: pin("#e0322f", "rgba(224,50,47,0.3)") })
      .bindTooltip("Fim do trajeto")
      .addTo(g);
    events.forEach((ev) => {
      L.marker([ev.lat, ev.lng], { icon: eventIcon })
        .bindTooltip(`${ev.label} · ${ev.time}`)
        .addTo(g);
    });

    m.fitBounds(line.getBounds(), { padding: [28, 28] });
  }, [path, events]);

  return <div ref={el} className={className} />;
}
