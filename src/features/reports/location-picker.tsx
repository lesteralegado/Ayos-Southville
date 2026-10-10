"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Props = {
  latitude: string;
  longitude: string;
  locale: "en" | "fil";
  onSelect: (latitude: string, longitude: string) => void;
};
export function LocationPicker({
  latitude,
  longitude,
  locale,
  onSelect,
}: Props) {
  const fil = locale === "fil";
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "failed">(
    "idle",
  );
  const [locationError, setLocationError] = useState("");
  const select = useEffectEvent(onSelect);
  useEffect(() => {
    if (!enabled || !container.current) return;
    let cancelled = false;
    async function load() {
      try {
        const libre = await import("maplibre-gl");
        if (cancelled || !container.current) return;
        // MapLibre 6 requires an explicit worker URL when bundled by Next.js.
        libre.setWorkerUrl(
          new URL(
            "maplibre-gl/dist/maplibre-gl-worker.mjs",
            import.meta.url,
          ).toString(),
        );
        const instance = new libre.Map({
          container: container.current,
          center: [121.126, 14.281],
          zoom: 15,
          minZoom: 12,
          maxZoom: 18,
          maxBounds: [
            [121.08, 14.23],
            [121.18, 14.33],
          ],
          attributionControl: false,
          style: {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                maxzoom: 19,
                attribution: "© OpenStreetMap contributors",
              },
            },
            layers: [{ id: "osm", type: "raster", source: "osm" }],
          },
        });
        map.current = instance;
        instance.addControl(
          new libre.NavigationControl({ showCompass: false }),
          "top-right",
        );
        marker.current = new libre.Marker({ color: "#1f674b" });
        instance.on("load", () => {
          if (!cancelled) setState("ready");
        });
        instance.on("error", () => {
          if (!cancelled) setState("failed");
        });
        instance.on("click", (event) => {
          marker.current?.setLngLat(event.lngLat).addTo(instance);
          select(event.lngLat.lat.toFixed(6), event.lngLat.lng.toFixed(6));
        });
      } catch {
        if (!cancelled) setState("failed");
      }
    }
    void load();
    return () => {
      cancelled = true;
      marker.current?.remove();
      map.current?.remove();
      marker.current = null;
      map.current = null;
    };
  }, [enabled, attempt]);
  useEffect(() => {
    const lat = Number(latitude),
      lon = Number(longitude);
    if (
      state === "ready" &&
      latitude &&
      longitude &&
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lon) <= 180 &&
      map.current
    )
      marker.current?.setLngLat([lon, lat]).addTo(map.current);
    else if (!latitude || !longitude) marker.current?.remove();
  }, [latitude, longitude, state]);
  function currentLocation() {
    if (!navigator.geolocation) {
      setLocationError(
        fil
          ? "Hindi available ang lokasyon. Gumamit ng landmark o coordinates."
          : "Location is unavailable. Use a landmark or coordinates.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSelect(
          position.coords.latitude.toFixed(6),
          position.coords.longitude.toFixed(6),
        );
        setLocationError("");
      },
      () =>
        setLocationError(
          fil
            ? "Hindi pinayagan ang lokasyon. Gumamit ng landmark o coordinates."
            : "Location access was unavailable. Use a landmark or coordinates.",
        ),
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }
  return (
    <div className="intake-location">
      <p className="field-help">
        {fil
          ? "Opsyonal ang mapa. Maaari kang gumamit ng landmark lamang. Kapag binuksan, makikita ng tile provider ang IP address at tinitingnang lugar, hindi ang iyong household details."
          : "The map is optional; a landmark is enough. Opening it shares your IP address and viewed area with the tile provider, not your household details."}
      </p>
      <div className="intake-location-actions">
        <button
          type="button"
          className="button button-quiet"
          onClick={() => {
            setState("loading");
            setEnabled(true);
            setAttempt((value) => value + 1);
          }}
        >
          {state === "failed"
            ? fil
              ? "Subukan ang mapa"
              : "Retry map"
            : fil
              ? "Buksan ang mapa"
              : "Open map"}
        </button>
        <button
          type="button"
          className="button button-quiet"
          onClick={currentLocation}
        >
          {fil ? "Gamitin ang aking lokasyon" : "Use my current location"}
        </button>
      </div>
      {enabled && (
        <div
          ref={container}
          className="intake-map"
          role="region"
          aria-label={
            fil ? "Opsyonal na mapa ng lokasyon" : "Optional location map"
          }
        />
      )}
      <p className="field-help" role="status" aria-live="polite">
        {state === "loading"
          ? fil
            ? "Naglo-load ang mapa…"
            : "Loading map…"
          : state === "failed"
            ? fil
              ? "Hindi available ang mapa. Maaari ka pa ring gumamit ng landmark o coordinates."
              : "The map is unavailable. You can still use a landmark or coordinates."
            : state === "ready"
              ? fil
                ? "I-tap ang lokasyon. Maaari ring ilagay ang coordinates sa ibaba."
                : "Tap the location, or enter coordinates below."
              : ""}{" "}
        {locationError}
      </p>
      {enabled && (
        <p className="map-attribution">
          ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap contributors
          </a>{" "}
          ·{" "}
          <a
            href="https://operations.osmfoundation.org/policies/tiles/"
            target="_blank"
            rel="noreferrer"
          >
            {fil ? "Patakaran ng tile provider" : "Tile provider policy"}
          </a>
        </p>
      )}
    </div>
  );
}
