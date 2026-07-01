import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import {
  Attribution,
  defaults as defaultControls,
  FullScreen,
  MousePosition,
  ScaleLine,
  ZoomToExtent,
} from 'ol/control';
import { createStringXY } from 'ol/coordinate';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  @ViewChild('mapElement', { static: true }) mapElement!: ElementRef;
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;

  ngOnInit(): void {
    // Initialize OpenLayers map
    const map = new Map({
      target: this.mapElement.nativeElement,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
      controls: defaultControls().extend([
        new FullScreen(),
        new ScaleLine(),
        new ZoomToExtent({
          extent: [-180, -90, 180, 90],
        }),
        new MousePosition({
          coordinateFormat: createStringXY(4),
          projection: 'EPSG:4326',
          className: 'custom-mouse-position',
        }),
      ]),
    });

    // Add drag-to-move functionality
    this.addDragFunctionality();
  }

  private addDragFunctionality(): void {
    const mapContainer = document.querySelector(
      '.map-container'
    ) as HTMLElement;

    if (!mapContainer) {
      console.error('Map container not found!');
      return;
    }

    // Define movement and rotation limits
    const maxMovement = 40; // Slightly smaller movement range for a controlled feel
    const maxRotation = 10; // Maximum rotation angle for 3D effect
    const bounceBackSpeed = 0.5; // Speed for bounce-back in seconds

    // Mouse down event
    mapContainer.addEventListener('mousedown', (event: MouseEvent) => {
      this.isDragging = true;
      this.startX = event.clientX - this.currentX;
      this.startY = event.clientY - this.currentY;
      mapContainer.style.cursor = 'grabbing';
      mapContainer.style.transition = ''; // Disable transition for smooth dragging
    });

    // Mouse move event
    document.addEventListener('mousemove', (event: MouseEvent) => {
      if (!this.isDragging) return;

      // Calculate new positions
      let newX = event.clientX - this.startX;
      let newY = event.clientY - this.startY;

      // Clamp movement and apply easing for a smoother effect
      const easedX = Math.max(-maxMovement, Math.min(newX, maxMovement));
      const easedY = Math.max(-maxMovement, Math.min(newY, maxMovement));

      // Calculate rotation angles based on movement
      const rotateX = (-easedY / maxMovement) * maxRotation; // Invert Y for natural tilt
      const rotateY = (easedX / maxMovement) * maxRotation;

      // Update positions and apply transformations
      this.currentX = easedX;
      this.currentY = easedY;
      mapContainer.style.transform = `translate(${easedX}px, ${easedY}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    // Mouse up event
    document.addEventListener('mouseup', () => {
      if (!this.isDragging) return;

      this.isDragging = false;
      mapContainer.style.cursor = 'grab';

      // Smooth bounce-back effect to original position
      mapContainer.style.transition = `transform ${bounceBackSpeed}s ease-out`;
      mapContainer.style.transform = `translate(0, 0) rotateX(0deg) rotateY(0deg)`;

      // Reset values after animation
      this.currentX = 0;
      this.currentY = 0;
    });

    // Optional: Reset position and rotation on double click
    mapContainer.addEventListener('dblclick', () => {
      mapContainer.style.transition = `transform ${bounceBackSpeed}s ease-out`;
      mapContainer.style.transform =
        'translate(0, 0) rotateX(0deg) rotateY(0deg)';
      this.currentX = 0;
      this.currentY = 0;
    });
  }
}