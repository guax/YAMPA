import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { DiscoveredNode } from '../types';

interface NodeMapProps {
  nodes: DiscoveredNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

export const NodeMap: React.FC<NodeMapProps> = ({ nodes, selectedNodeId, onSelectNode }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Filter only nodes with valid location
  const locatedNodes = nodes.filter(n => n.latitude && n.longitude && n.latitude !== 0 && n.longitude !== 0);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not exists
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([0, 0], 2);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Update Markers
    // 1. Remove markers for nodes that are no longer present or lost location
    const currentIds = new Set(locatedNodes.map(n => n.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // 2. Add or Update markers
    const bounds = L.latLngBounds([]);
    let hasBounds = false;

    locatedNodes.forEach(node => {
      if (!node.latitude || !node.longitude) return;

      const isSelected = selectedNodeId === node.id;
      const latLng = L.latLng(node.latitude, node.longitude);
      bounds.extend(latLng);
      hasBounds = true;

      // Custom Div Icon
      const iconHtml = `
        <div class="relative group">
          <div class="absolute -inset-1 rounded-full ${isSelected ? 'bg-blue-500 blur opacity-75' : 'bg-transparent'}"></div>
          <div class="relative w-4 h-4 rounded-full border-2 border-slate-900 shadow-lg transition-transform hover:scale-125
            ${isSelected ? 'bg-blue-500' : 'bg-emerald-500'}">
          </div>
          <div class="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
            ${node.name}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'bg-transparent',
        html: iconHtml,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      if (markersRef.current.has(node.id)) {
        const marker = markersRef.current.get(node.id)!;
        marker.setLatLng(latLng);
        marker.setIcon(icon);
        marker.setZIndexOffset(isSelected ? 1000 : 0);
      } else {
        const marker = L.marker(latLng, { icon }).addTo(map);
        marker.on('click', () => onSelectNode(node.id));
        markersRef.current.set(node.id, marker);
      }
    });

    // Fit bounds only on initial load or if we want to auto-center (optional logic)
    // For now, let's only fit bounds if it's the first time we see nodes and user hasn't moved map much
    // Or just provided a button. For simplicity, if we have nodes and map center is 0,0, fit bounds.
    if (hasBounds && map.getCenter().equals({lat: 0, lng: 0})) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

  }, [locatedNodes, selectedNodeId, onSelectNode]);

  // Effect to fly to selected node
  useEffect(() => {
    if (selectedNodeId && mapInstanceRef.current && markersRef.current.has(selectedNodeId)) {
        const node = nodes.find(n => n.id === selectedNodeId);
        if (node && node.latitude && node.longitude) {
            mapInstanceRef.current.flyTo([node.latitude, node.longitude], 14, { duration: 1.5 });
        }
    }
  }, [selectedNodeId, nodes]);

  return (
    <div className="w-full h-full relative bg-slate-900">
       <div ref={mapContainerRef} className="absolute inset-0 z-0" />
       
       {locatedNodes.length === 0 && (
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/80 p-6 rounded-xl border border-slate-700 text-center z-10 backdrop-blur">
               <p className="text-slate-400">No nodes with location data detected yet.</p>
           </div>
       )}
    </div>
  );
};