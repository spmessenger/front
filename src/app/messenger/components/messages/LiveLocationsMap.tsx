"use client";

import React from "react";
import type { DivIcon, LatLngExpression, Map as LeafletMap, Marker } from "leaflet";
import type { LiveLocationShareType } from "@/lib/types";

type LiveLocationsMapProps = {
  shares: LiveLocationShareType[];
  height?: number | string;
};

type MarkerAnimationState = {
  marker: Marker;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  startedAt: number;
  endsAt: number;
  share: LiveLocationShareType;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatExactTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function buildLiveDotIconHtml(share: LiveLocationShareType): string {
  const safeName = escapeHtml(share.username || "User");
  return `
    <div class="geo-live-marker geo-live-marker-fade">
      <div class="geo-live-dot-wrap">
        <div class="geo-live-dot-pulse"></div>
        <div class="geo-live-dot-core"></div>
      </div>
      <div class="geo-live-name">${safeName}</div>
    </div>
  `;
}

function buildLivePopupHtml(share: LiveLocationShareType): string {
  const safeName = escapeHtml(share.username || "User");
  const exactTimeText = escapeHtml(formatExactTime(share.updated_at));
  const avatarLetter = escapeHtml((share.username || "U").slice(0, 1).toUpperCase());
  const avatarInner = share.avatar_url
    ? `<img src="${escapeHtml(share.avatar_url)}" alt="${safeName}" class="geo-leaflet-popup-avatar-image" />`
    : `<span class="geo-leaflet-popup-avatar-fallback">${avatarLetter}</span>`;

  return `
    <div class="geo-leaflet-popup">
      <div class="geo-leaflet-popup-avatar">${avatarInner}</div>
      <div class="geo-leaflet-popup-content">
        <div class="geo-leaflet-popup-name">${safeName}</div>
        <div class="geo-leaflet-popup-time">${exactTimeText}</div>
      </div>
    </div>
  `;
}

export default function LiveLocationsMap({ shares, height = 220 }: LiveLocationsMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);
  const markerStatesRef = React.useRef<Map<number, MarkerAnimationState>>(new Map());
  const leafletRef = React.useRef<typeof import("leaflet") | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const previousCountRef = React.useRef(0);

  React.useEffect(() => {
    let isDisposed = false;
    if (!containerRef.current || mapRef.current) {
      return;
    }

    void import("leaflet").then((L) => {
      if (isDisposed || !containerRef.current) {
        return;
      }

      leafletRef.current = L;
      const fallbackCenter: LatLngExpression =
        shares.length > 0 ? [shares[0].latitude, shares[0].longitude] : [55.751244, 37.618423];
      const map = L.map(containerRef.current, {
        center: fallbackCenter,
        zoom: 15,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      isDisposed = true;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      markerStatesRef.current.clear();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [shares]);

  React.useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) {
      return;
    }

    const markerStates = markerStatesRef.current;
    const now = performance.now();
    const nextUserIds = new Set(shares.map((share) => share.user_id));

    for (const [userId, state] of markerStates) {
      if (!nextUserIds.has(userId)) {
        map.removeLayer(state.marker);
        markerStates.delete(userId);
      }
    }

    shares.forEach((share) => {
      const existingState = markerStates.get(share.user_id);
      if (!existingState) {
        const markerIcon: DivIcon = L.divIcon({
          className: "geo-live-div-icon",
          html: buildLiveDotIconHtml(share),
          iconSize: [120, 62],
          iconAnchor: [18, 46],
        });
        const marker = L.marker([share.latitude, share.longitude], { icon: markerIcon }).addTo(map);
        marker.bindPopup(buildLivePopupHtml(share));
        markerStates.set(share.user_id, {
          marker,
          fromLat: share.latitude,
          fromLng: share.longitude,
          toLat: share.latitude,
          toLng: share.longitude,
          startedAt: now,
          endsAt: now,
          share,
        });
        return;
      }

      const currentLatLng = existingState.marker.getLatLng();
      existingState.fromLat = currentLatLng.lat;
      existingState.fromLng = currentLatLng.lng;
      existingState.toLat = share.latitude;
      existingState.toLng = share.longitude;
      existingState.startedAt = now;
      existingState.endsAt = now + 2800;
      existingState.share = share;
      existingState.marker.setIcon(
        L.divIcon({
          className: "geo-live-div-icon",
          html: buildLiveDotIconHtml(share),
          iconSize: [120, 62],
          iconAnchor: [18, 46],
        }),
      );
      existingState.marker.setPopupContent(buildLivePopupHtml(share));
      markerStates.set(share.user_id, existingState);
    });

    if (shares.length > 0) {
      const shouldRefit = previousCountRef.current !== shares.length;
      if (shares.length === 1) {
        const share = shares[0];
        map.setView([share.latitude, share.longitude], Math.max(map.getZoom(), 15), {
          animate: shouldRefit,
        });
      } else if (shouldRefit) {
        const bounds = L.latLngBounds(shares.map((share) => [share.latitude, share.longitude]));
        map.fitBounds(bounds.pad(0.3), { animate: true, maxZoom: 16 });
      }
    }
    previousCountRef.current = shares.length;

    const animate = () => {
      let needsNextFrame = false;
      const timestamp = performance.now();
      markerStates.forEach((state) => {
        if (state.endsAt <= state.startedAt) {
          return;
        }
        const duration = state.endsAt - state.startedAt;
        const progress = Math.max(0, Math.min(1, (timestamp - state.startedAt) / duration));
        if (progress < 1) {
          needsNextFrame = true;
        }
        const lat = state.fromLat + (state.toLat - state.fromLat) * progress;
        const lng = state.fromLng + (state.toLng - state.fromLng) * progress;
        state.marker.setLatLng([lat, lng]);
      });

      if (needsNextFrame) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [shares]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
        background: "var(--mess-shell-bg)",
      }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    />
  );
}
