// src/components/Map/MapComponent.jsx

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import api from '../../apiClient';

// Fix for default markers in React + Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapComponent = ({
  center,
  pickup,
  dropoff,
  drivers = [],
  driverLocation,
  tracking = false,
  height = '400px',
  onMapClick,
  rideStatus 
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routingControlRef = useRef(null);
  const driverToPickupRouteRef = useRef(null);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      const defaultCenter = center || { lat: 30.7333, lng: 76.7794 }; // Chandigarh, India
      const map = L.map(mapRef.current, {
        center: [defaultCenter.lat, defaultCenter.lng],
        zoom: 13,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
       setTimeout(() => {
        map.invalidateSize();
      }, 100);

      if (onMapClick) {
        map.on('click', (e) => {
          onMapClick({
            lat: e.latlng.lat,
            lng: e.latlng.lng,
          });
        });
      }

      return () => {
        if (mapInstanceRef.current) {
          if (onMapClick) {
            map.off('click');
          }
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    }
  }, [center, onMapClick]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    const map = mapInstanceRef.current;
    const bounds = L.latLngBounds([]);

    // Clear previous routing controls
    if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
    }
    if (driverToPickupRouteRef.current) {
        map.removeControl(driverToPickupRouteRef.current);
        driverToPickupRouteRef.current = null;
    }

    const isCoordValid = (coord) => coord && typeof coord.lat === 'number' && typeof coord.lng === 'number';

    // Add Pickup Marker
    if (isCoordValid(pickup)) {
      const pickupIcon = L.divIcon({
        html: `<div style="background-color: #10B981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        className: 'custom-marker'
      });
      const pickupMarker = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon })
        .addTo(map)
        .bindPopup('Pickup Location');
      markersRef.current.push(pickupMarker);
      bounds.extend([pickup.lat, pickup.lng]);
    }

    // Add Dropoff Marker
    if (isCoordValid(dropoff)) {
      const dropoffIcon = L.divIcon({
        html: `<div style="background-color: #EF4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        className: 'custom-marker'
      });
      const dropoffMarker = L.marker([dropoff.lat, dropoff.lng], { icon: dropoffIcon })
        .addTo(map)
        .bindPopup('Dropoff Location');
      markersRef.current.push(dropoffMarker);
      bounds.extend([dropoff.lat, dropoff.lng]);
    }

    // Add Driver markers (non-tracking mode)
    if (!tracking && drivers.length > 0) {
      drivers.forEach((driver) => {
        if (isCoordValid(driver.currentLocation)) {
          const driverIcon = L.divIcon({
            html: `<div style="background-color: #2563EB; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16, 16],
            className: 'custom-marker'
          });
          const driverMarker = L.marker([driver.currentLocation.lat, driver.currentLocation.lng], { icon: driverIcon })
            .addTo(map)
            .bindPopup(`Driver: ${driver.user?.username || 'Unknown'} - ${driver.vehicleType || 'N/A'} (★${driver.rating || 'N/A'})`);
          markersRef.current.push(driverMarker);
          bounds.extend([driver.currentLocation.lat, driver.currentLocation.lng]);
        }
      });
    }

    // Add single Driver marker with a car icon (tracking mode)
    if (tracking && isCoordValid(driverLocation)) {
      const carIconHtml = `
        <div style="background-color: #2563EB; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-car">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L14 6L5 4l-2 3v5l2 2h2"></path>
            <circle cx="7" cy="17" r="2"></circle>
            <path d="M9 17h6"></path>
            <circle cx="17" cy="17" r="2"></circle>
          </svg>
        </div>
      `;
      const driverMarker = L.marker([driverLocation.lat, driverLocation.lng], {
        icon: L.divIcon({ html: carIconHtml, iconSize: [32, 32], className: 'custom-marker' })
      })
      .addTo(map)
      .bindPopup('Your Driver');
      markersRef.current.push(driverMarker);
      bounds.extend([driverLocation.lat, driverLocation.lng]);
    }
    
    const hasValidDriverAndPickup = tracking && isCoordValid(driverLocation) && isCoordValid(pickup);
    const hasValidPickupAndDropoff = isCoordValid(pickup) && isCoordValid(dropoff);

    // Add route from driver to pickup location (only for 'accepted' status)
    if (hasValidDriverAndPickup && rideStatus === 'accepted') {
      const driverToPickupRoute = L.Routing.control({
        waypoints: [
          L.latLng(driverLocation.lat, driverLocation.lng),
          L.latLng(pickup.lat, pickup.lng)
        ],
        routeWhileDragging: false,
        createMarker: () => null,
        lineOptions: {
          styles: [{ color: '#008000', opacity: 0.8, weight: 5, dashArray: '5, 10' }]
        },
        show: false,
        addWaypoints: false,
      }).addTo(mapInstanceRef.current);

      driverToPickupRoute.on('routesfound', (e) => {
        if (e.routes.length > 0) {
          const routeBounds = L.latLngBounds(e.routes[0].coordinates);
          mapInstanceRef.current.fitBounds(routeBounds, { padding: [50, 50] });
        }
      });
      driverToPickupRouteRef.current = driverToPickupRoute;
    }

    // Add the main routing control for the trip (only for 'arrived', 'started', or 'completed' status)
    if (hasValidPickupAndDropoff && ['arrived', 'started', 'completed'].includes(rideStatus)) {
      const routingControl = L.Routing.control({
        waypoints: [
          L.latLng(pickup.lat, pickup.lng),
          L.latLng(dropoff.lat, dropoff.lng)
        ],
        routeWhileDragging: false,
        createMarker: () => null,
        lineOptions: {
          styles: [{ color: '#2563EB', opacity: 0.8, weight: 5 }]
        },
        show: false,
        addWaypoints: false,
      }).addTo(mapInstanceRef.current);

      routingControl.on('routesfound', (e) => {
        if (e.routes.length > 0) {
          const routeBounds = L.latLngBounds(e.routes[0].coordinates);
          mapInstanceRef.current.fitBounds(routeBounds, { padding: [50, 50] });
        }
      });

      routingControlRef.current = routingControl;
    }


    if (bounds.isValid() && !routingControlRef.current && !driverToPickupRouteRef.current) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView([center.lat, center.lng], map.getZoom() || 13);
    }
  }, [pickup, dropoff, drivers, driverLocation, tracking, center, rideStatus]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%' }}
      className="rounded-lg z-0"
    />
  );
};

export default MapComponent;
