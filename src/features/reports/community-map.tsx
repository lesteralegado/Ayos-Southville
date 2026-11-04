"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Locale } from "@/features/i18n/messages";
import type { PublicReportDetail } from "./report-module";
import { discoveryCopy } from "./discovery-copy";

export const communityMapStyle: StyleSpecification = {
  version: 8,
  sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxzoom: 19 } },
  layers: [{ id: "community-basemap", type: "raster", source: "osm" }],
};

export default function CommunityMap({ reports, locale, style = communityMapStyle }: {
  reports: PublicReportDetail[]; locale: Locale; style?: StyleSpecification;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const copy = discoveryCopy[locale];
  useEffect(() => {
    let disposed = false, map: MapLibreMap | undefined;
    const timeout = window.setTimeout(() => { if (!disposed) setState("error"); }, 15_000);
    import("maplibre-gl").then(({ Map, Marker, Popup, NavigationControl, AttributionControl, setWorkerUrl }) => {
      if (disposed || !container.current) return;
      setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
      map = new Map({ container: container.current, style, center: [121.127, 14.281], zoom: 13,
        maxZoom: 15, minZoom: 10, attributionControl: false, scrollZoom: false,
        cooperativeGestures: true,
        locale: { "NavigationControl.ZoomIn": locale === "fil" ? "Palakihin ang mapa" : "Zoom in",
          "NavigationControl.ZoomOut": locale === "fil" ? "Paliitin ang mapa" : "Zoom out",
          "AttributionControl.ToggleAttribution": locale === "fil" ? "Mga pinagmulan ng mapa" : "Toggle attribution" },
      });
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new AttributionControl({ compact: false }), "bottom-right");
      map.getCanvas().setAttribute("aria-label", copy.mapLabel);
      const points = new globalThis.Map<string, PublicReportDetail[]>();
      reports.forEach((report) => {
        if (!report.publicLocation) return;
        const key = `${report.publicLocation.longitude},${report.publicLocation.latitude}`;
        points.set(key, [...points.get(key) ?? [], report]);
      });
      points.forEach((group) => {
        const point = group[0].publicLocation!;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "public-map-marker";
        button.textContent = String(group.length);
        button.setAttribute("aria-label", `${group.length} ${copy.count}: ${group[0].publicArea}`);
        button.dataset.references = group.map(report => report.reference).join(",");
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          const list = document.createElement("ul");
          group.forEach((report) => {
            const item = document.createElement("li"), link = document.createElement("a");
            link.href = `#report-${report.reference}`;
            link.textContent = `${report.reference}: ${report.publicSummary}`;
            item.append(link); list.append(item);
          });
          new Popup({ maxWidth: "320px" }).setLngLat([point.longitude, point.latitude]).setDOMContent(list).addTo(map!);
          list.querySelector("a")?.focus();
        });
        new Marker({ element: button }).setLngLat([point.longitude, point.latitude]).addTo(map!);
      });
      map.once("load", () => { window.clearTimeout(timeout); if (!disposed) setState("ready"); });
      map.on("error", () => { if (!disposed) setState("error"); });
    }).catch(() => { if (!disposed) setState("error"); });
    return () => { disposed = true; window.clearTimeout(timeout); map?.remove(); };
  }, [reports, locale, style, copy.mapLabel, copy.count]);
  return <div className="public-map-section">
    <div ref={container} className="public-community-map" aria-label={copy.mapLabel} />
    {state !== "ready" && <p role="status">{state === "error" ? copy.mapError : copy.mapLoading}</p>}
  </div>;
}
