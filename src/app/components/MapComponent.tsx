"use client"; // if using app directory

import "leaflet/dist/leaflet.css";

// Fix for default markers in Leaflet
import L from "leaflet";

// Type assertion for the prototype - using any to avoid TypeScript issues
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

// Export the configured L object if needed
export { L };
