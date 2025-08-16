"use client"; // if using app directory

import "leaflet/dist/leaflet.css";

// Fix for default markers in Leaflet
import L from "leaflet";

// Define proper interface for the prototype
interface LeafletIconDefault {
  _getIconUrl?: () => string;
}

// Type assertion for the prototype to safely delete _getIconUrl
const iconPrototype = L.Icon.Default.prototype as LeafletIconDefault;
delete iconPrototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

// Export the configured L object if needed
export { L };
