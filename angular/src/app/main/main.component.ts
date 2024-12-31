import { Component } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-easybutton';
import { ApiService } from './api.service';

@Component({
  selector: 'main-app',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
  providers: [ApiService],
})
export class MainComponent {
  public isCardVisible = true;

  // Mock Data
  public regions = ['Lombardia', 'Lazio', 'Campania', 'Sicilia'];
  public provinces: Record<string, string[]> = {
    Lombardia: ['Milano', 'Bergamo', 'Brescia'],
    Lazio: ['Roma', 'Viterbo', 'Latina'],
    Campania: ['Napoli', 'Salerno', 'Avellino'],
    Sicilia: ['Palermo', 'Catania', 'Messina'],
  };
  public cities: Record<string, string[]> = {
    Milano: ['Milano Centro', 'Rho', 'Sesto San Giovanni'],
    Roma: ['Trastevere', 'Tivoli', 'Ostia'],
    Napoli: ['Posillipo', 'Vomero', 'Chiaia'],
    Palermo: ['Mondello', 'Sferracavallo', 'Bagheria'],
  };

  // Selected Items
  public selectedRegion: string = '';
  public selectedProvince: string = '';
  public selectedCity: string = '';

  // Filtered Data
  public filteredRegions = [...this.regions];
  public filteredProvinces: string[] = [];
  public filteredCities: string[] = [];

  private map!: L.Map;

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  toggleCard(): void {
    this.isCardVisible = !this.isCardVisible;
  }

  // Initialize Map
  private initializeMap(): void {
    this.map = L.map('map', {
      center: [45.2406927, 10.27472],
      zoom: 8,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.map.invalidateSize();
  }

  // Handlers
  onRegionChange(region: string): void {
    this.filteredProvinces = this.provinces[region] || [];
    this.selectedProvince = '';
    this.filteredCities = [];
    this.selectedCity = '';
  }

  onProvinceChange(province: string): void {
    this.filteredCities = this.cities[province] || [];
    this.selectedCity = '';
  }
}