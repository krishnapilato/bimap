import { Component } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-easybutton';
import { ApiService } from './api.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'main-app',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
  providers: [ApiService],
})
export class MainComponent {
  public isCardVisible = true;
  public destinationInput: string = '';
  public suggestions: any[] = [];
  private inputSubject: Subject<string> = new Subject<string>();

  // Form Data
  public selectedDestination: string = '';
  public startDate: string = '';
  public endDate: string = '';
  public numberOfTravelers: number = 1;
  public selectedTravelMode: string = 'car';
  public notes: string = '';

  // Coordinates
  public latitude: string = '48.858844'; // Default: Eiffel Tower
  public longitude: string = '2.294351'; // Default: Eiffel Tower

  private map!: L.Map;

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    this.initializeMap();

    this.inputSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => this.fetchSuggestions(query));
  }

  toggleCard(): void {
    this.isCardVisible = !this.isCardVisible;
  }

  onDestinationInput(): void {
    // Trigger search only when the input is not empty
    if (this.destinationInput.trim().length > 0) {
      this.inputSubject.next(this.destinationInput);
    } else {
      this.suggestions = [];
    }
  }

  fetchSuggestions(query: string): void {
    const apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&addressdetails=1&limit=5`;

    this.http.get(apiUrl).subscribe({
      next: (data: any) => {
        // Extract display_name from the results
        this.suggestions = data.map((item: any) => item.display_name);
      },
      error: (err) => console.error('Error fetching suggestions:', err),
    });
  }

  selectDestination(suggestion: any): void {
    this.destinationInput = suggestion.display_name;
    this.suggestions = [];
    console.log('Selected Destination:', suggestion);
  }

  // Initialize Map
  private initializeMap(): void {
    this.map = L.map('map', {
      center: [45.2406927, 10.27472], // Default center (Italy)
      zoom: 8,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    // Add event listener for map double-clicks
    this.map.on('dblclick', (event: L.LeafletMouseEvent) =>
      this.onMapClick(event)
    );

    this.map.invalidateSize();
  }

  // Handle Map Clicks
  onMapClick(event: any): void {
    const { lat, lng } = event.latlng;
    this.latitude = lat.toFixed(6);
    this.longitude = lng.toFixed(6);
    this.selectedDestination = `Lat: ${this.latitude}, Lng: ${this.longitude}`; // Populate destination with coordinates
  }

  // Submit Form
  onSubmit(): void {
    console.log('Travel Plan Submitted:');
    console.log(`Destination: ${this.selectedDestination}`);
    console.log(`Start Date: ${this.startDate}`);
    console.log(`End Date: ${this.endDate}`);
    console.log(`Travelers: ${this.numberOfTravelers}`);
    console.log(`Travel Mode: ${this.selectedTravelMode}`);
    console.log(`Notes: ${this.notes}`);
    console.log(`Coordinates: [${this.latitude}, ${this.longitude}]`);
  }
}