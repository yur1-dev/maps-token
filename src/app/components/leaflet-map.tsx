"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";

// Define proper types for Leaflet - using any for compatibility with dynamic import
type LeafletMap = any;
type LeafletMarker = any;
type LeafletIcon = any;
type LeafletLibrary = any;

interface LeafletMapProps {
  onMapClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  rotation: number;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ onMapClick, rotation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [L, setL] = useState<LeafletLibrary | null>(null);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load Leaflet dynamically on client side only
  useEffect(() => {
    if (!isClient) return;

    const loadLeaflet = async () => {
      const leaflet = await import("leaflet");

      // Fix for default markers
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl;
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      setL(leaflet.default as any);
    };

    loadLeaflet();
  }, [isClient]);

  // Initialize map
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    try {
      // Create map instance
      const map = L.map(mapRef.current, {
        center: [14.5995, 120.9842], // Manila, Philippines
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      // Add tile layer
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Esri",
        }
      ).addTo(map);

      // Create custom directional icon
      const createDirectionalIcon = (rotation: number): any => {
        return L.divIcon({
          html: `
            <div style="
              width: 20px; 
              height: 20px; 
              background: #ff4444; 
              border: 3px solid white; 
              border-radius: 50%; 
              position: relative;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              transform: rotate(${rotation}deg);
            ">
              <div style="
                position: absolute;
                top: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-bottom: 12px solid #ff4444;
              "></div>
            </div>
          `,
          className: "custom-directional-marker",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
      };

      // Add marker
      const marker = L.marker([14.5995, 120.9842], {
        icon: createDirectionalIcon(rotation),
      }).addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Force resize after initialization
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (error) {
          console.error("Error removing map:", error);
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [L, rotation]);

  // Update marker rotation when rotation prop changes
  useEffect(() => {
    if (!L || !markerRef.current) return;

    const createDirectionalIcon = (rotation: number): any => {
      return L.divIcon({
        html: `
          <div style="
            width: 20px; 
            height: 20px; 
            background: #ff4444; 
            border: 3px solid white; 
            border-radius: 50%; 
            position: relative;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transform: rotate(${rotation}deg);
          ">
            <div style="
              position: absolute;
              top: -8px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-bottom: 12px solid #ff4444;
            "></div>
          </div>
        `,
        className: "custom-directional-marker",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
    };

    markerRef.current.setIcon(createDirectionalIcon(rotation));
  }, [L, rotation]);

  // Show loading state while Leaflet loads
  if (!isClient) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" onClick={onMapClick}>
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ minHeight: "100px" }}
      />

      {/* Expand button overlay */}
      <button className="absolute bottom-2 right-2 w-6 h-6 bg-white rounded shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors z-10">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="15,3 21,3 21,9" />
          <polyline points="9,21 3,21 3,15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      </button>
    </div>
  );
};

export default LeafletMap;
