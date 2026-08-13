import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  lat: number;
  lng: number;
  heading: number;
  path?: [number, number][];
  className?: string;
};

const bikeIcon = (heading: number) =>
  L.divIcon({
    className: "",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `<div style="width:38px;height:38px;display:grid;place-items:center">
      <div style="position:absolute;inset:0;border-radius:9999px;background:rgba(132,196,43,0.25)"></div>
      <div style="transform:rotate(${heading}deg);width:26px;height:26px;border-radius:9999px;background:#84C42B;border:2px solid #091835;display:grid;place-items:center">
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid #091835;margin-bottom:2px"></div>
      </div>
    </div>`,
  });

export default function MotoMap({ lat, lng, heading, path, className }: Props) {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: false }).setView(
      [lat, lng],
      15,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      // Offline Wi-Fi mode fallback tile
      errorTileUrl:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#dfe9ee"/></svg>',
        ),
    }).addTo(m);
    marker.current = L.marker([lat, lng], { icon: bikeIcon(heading) }).addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current || !marker.current) return;
    marker.current.setLatLng([lat, lng]);
    marker.current.setIcon(bikeIcon(heading));
    map.current.panTo([lat, lng], { animate: true });
  }, [lat, lng, heading]);

  const pathRef = useRef<L.Polyline | null>(null);
  useEffect(() => {
    if (!map.current || !path?.length) return;
    pathRef.current?.remove();
    pathRef.current = L.polyline(path, { color: "#84C42B", weight: 5, opacity: 0.9 }).addTo(
      map.current,
    );
    map.current.fitBounds(pathRef.current.getBounds(), { padding: [24, 24] });
  }, [path]);

  return <div ref={el} className={className} />;
}
