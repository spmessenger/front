"use client";

import React from "react";
import type { DivIcon, Map as LeafletMap, Marker } from "leaflet";

type GeoLeafletMapProps = {
  latitude: number;
  longitude: number;
  markerName: string;
  markerAvatarUrl?: string;
  markerInitial?: string;
  sentAtIso: string;
  height: number | string;
  zoom?: number;
  interactive?: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMinutesAgo(diffMinutes: number): string {
  if (diffMinutes <= 0) {
    return "только что";
  }
  if (diffMinutes === 1) {
    return "1 минуту назад";
  }

  const mod10 = diffMinutes % 10;
  const mod100 = diffMinutes % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return `${diffMinutes} минуты назад`;
  }
  return `${diffMinutes} минут назад`;
}

function formatExactTime(date: Date): string {
  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function buildMarkerIconHtml({
  markerName,
  markerAvatarUrl,
  markerInitial,
  minutesAgoText,
}: {
  markerName: string;
  markerAvatarUrl?: string;
  markerInitial?: string;
  minutesAgoText: string;
}): string {
  const safeName = escapeHtml(markerName);
  const safeInitial = escapeHtml((markerInitial || markerName.slice(0, 1) || "U").toUpperCase());
  const safeMinutesAgo = escapeHtml(minutesAgoText);

  const avatarInner = markerAvatarUrl
    ? `<img src="${escapeHtml(markerAvatarUrl)}" alt="${safeName}" class="geo-leaflet-avatar-image" />`
    : `<span class="geo-leaflet-avatar-fallback">${safeInitial}</span>`;

  return `
    <div class="geo-leaflet-marker-root geo-leaflet-marker-fade">
      <div class="geo-leaflet-avatar-wrap">${avatarInner}</div>
      <div class="geo-leaflet-pin-tail"></div>
      <div class="geo-leaflet-name-label">${safeName}</div>
      <div class="geo-leaflet-age-label">${safeMinutesAgo}</div>
    </div>
  `;
}

function buildPopupHtml({
  markerName,
  markerAvatarUrl,
  markerInitial,
  exactTimeText,
}: {
  markerName: string;
  markerAvatarUrl?: string;
  markerInitial?: string;
  exactTimeText: string;
}): string {
  const safeName = escapeHtml(markerName);
  const safeInitial = escapeHtml((markerInitial || markerName.slice(0, 1) || "U").toUpperCase());
  const safeTime = escapeHtml(exactTimeText);

  const avatarInner = markerAvatarUrl
    ? `<img src="${escapeHtml(markerAvatarUrl)}" alt="${safeName}" class="geo-leaflet-popup-avatar-image" />`
    : `<span class="geo-leaflet-popup-avatar-fallback">${safeInitial}</span>`;

  return `
    <div class="geo-leaflet-popup">
      <div class="geo-leaflet-popup-avatar">${avatarInner}</div>
      <div class="geo-leaflet-popup-content">
        <div class="geo-leaflet-popup-name">${safeName}</div>
        <div class="geo-leaflet-popup-time">${safeTime}</div>
      </div>
    </div>
  `;
}

export default function GeoLeafletMap({
  latitude,
  longitude,
  markerName,
  markerAvatarUrl,
  markerInitial,
  sentAtIso,
  height,
  zoom = 16,
  interactive = true,
}: GeoLeafletMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);
  const markerRef = React.useRef<Marker | null>(null);
  const leafletRef = React.useRef<typeof import("leaflet") | null>(null);
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  const sentAtDate = React.useMemo(() => {
    const parsed = new Date(sentAtIso);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  }, [sentAtIso]);

  const minutesAgoText = React.useMemo(() => {
    const diffMinutes = Math.floor((nowMs - sentAtDate.getTime()) / 60000);
    return formatMinutesAgo(diffMinutes);
  }, [nowMs, sentAtDate]);

  const exactTimeText = React.useMemo(() => formatExactTime(sentAtDate), [sentAtDate]);

  React.useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60000);
    return () => window.clearInterval(timerId);
  }, []);

  React.useEffect(() => {
    let isDisposed = false;
    const container = containerRef.current;
    if (!container || mapRef.current) {
      return;
    }

    void import("leaflet").then((L) => {
      if (isDisposed || !containerRef.current) {
        return;
      }

      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        center: [latitude, longitude],
        zoom,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
        touchZoom: interactive,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const markerIcon: DivIcon = L.divIcon({
        className: "geo-leaflet-div-icon",
        html: buildMarkerIconHtml({
          markerName,
          markerAvatarUrl,
          markerInitial,
          minutesAgoText,
        }),
        iconSize: [160, 92],
        iconAnchor: [80, 78],
      });

      const marker = L.marker([latitude, longitude], { icon: markerIcon }).addTo(map);
      marker.bindPopup(
        buildPopupHtml({
          markerName,
          markerAvatarUrl,
          markerInitial,
          exactTimeText,
        }),
      );

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      isDisposed = true;
      markerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [interactive, latitude, longitude, zoom]);

  React.useEffect(() => {
    if (!mapRef.current || !markerRef.current) {
      return;
    }
    mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
    markerRef.current.setLatLng([latitude, longitude]);
  }, [latitude, longitude]);

  React.useEffect(() => {
    const L = leafletRef.current;
    const marker = markerRef.current;
    if (!L || !marker) {
      return;
    }

    const markerIcon: DivIcon = L.divIcon({
      className: "geo-leaflet-div-icon",
      html: buildMarkerIconHtml({
        markerName,
        markerAvatarUrl,
        markerInitial,
        minutesAgoText,
      }),
      iconSize: [160, 92],
      iconAnchor: [80, 78],
    });
    marker.setIcon(markerIcon);
    marker.setPopupContent(
      buildPopupHtml({
        markerName,
        markerAvatarUrl,
        markerInitial,
        exactTimeText,
      }),
    );
  }, [exactTimeText, markerAvatarUrl, markerInitial, markerName, minutesAgoText]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
        background: "var(--mess-shell-bg)",
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
    />
  );
}
