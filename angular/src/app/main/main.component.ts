import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FormModel } from './formdata';
import * as L from 'leaflet';
import * as $ from "jquery";
import {MatSnackBar} from '@angular/material/snack-bar';
import 'leaflet-easybutton';
import { ApiService } from './api.service';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { Tables } from './tables';
import { data } from 'jquery';

export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  {position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H'},
  {position: 2, name: 'Helium', weight: 4.0026, symbol: 'He'},
  {position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li'},
  {position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be'},
  {position: 5, name: 'Boron', weight: 10.811, symbol: 'B'},
  {position: 6, name: 'Carbon', weight: 12.0107, symbol: 'C'},
  {position: 7, name: 'Nitrogen', weight: 14.0067, symbol: 'N'},
  {position: 8, name: 'Oxygen', weight: 15.9994, symbol: 'O'},
  {position: 9, name: 'Fluorine', weight: 18.9984, symbol: 'F'},
  {position: 10, name: 'Neon', weight: 20.1797, symbol: 'Ne'},
];

@Component({
  selector: 'app-user-list',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
  providers: [ApiService]
})
export class MainComponent implements OnInit {

    displayedColumns: string[] = ['position', 'name', 'weight', 'symbol'];
  dataSource = new MatTableDataSource(ELEMENT_DATA);

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    this._snackbar.open('Filtered data for ' + filterValue, 'Close', {duration: 1000});
  }

    // FormControl attributes

  public searchTerm : FormControl = new FormControl();
  public searchMunicipalities : FormControl = new FormControl();
  public searchRegions : FormControl = new FormControl();
  public address : FormControl = new FormControl();
  public number : FormControl = new FormControl();
  public goodNaming : FormControl = new FormControl();
  public gooodId : FormControl = new FormControl();
  public istatCode : FormControl = new FormControl();
  public ilatitude : FormControl = new FormControl();
  public ilongitude : FormControl = new FormControl();
  public formData = new FormModel();

  // provinces attribute for getting autcomplete search data

  public provinces = <any>[];
  
  // map attribute for leaflet map

  private map: any;

  // latitude and longitude attributes for map

  public latitude!: number;
  public longitude!: number;
  public tables: Tables[] = [];
  public maxNumber!: number;

  constructor(private apiService: ApiService, private _snackbar: MatSnackBar) {
  }

  ngOnInit() {

    this.maxNumber = 10;
     this.apiService.findAll(this.maxNumber).subscribe(data => {
      this.tables = data;
    
    });

        // Get autocomplete search data for regions

    this.searchRegions.valueChanges.subscribe(term => {
      if (term != '' && term.length > 0) this.apiService.searchRegions(term).subscribe((data: any[]) => { this.provinces = data as any[]; });
      else this.provinces = [];
    });

    // Get autocomplete search data for provinces

    this.searchTerm.valueChanges.subscribe(term => {
      if (term != '' && term.length > 0) this.apiService.searchProvinces(term).subscribe((data: any[]) => { this.provinces = data as any[]; });
      else this.provinces = [];
    });

    // Get autocomplete search data for municipalities

    this.searchMunicipalities.valueChanges.subscribe(term => {
      if (term != '' && term.length > 0) this.apiService.searchMunicipalities(term).subscribe((data: any[]) => { this.provinces = data as any[]; });
      else this.provinces = [];
    });

        // Default layer for map

    var googleTerrain = L.tileLayer('https://{s}.google.com/vt/lyrs=m@221097413,transit,traffic,bike,images&x={x}&y={y}&z={z}', {attribution: '<a target="_blank" href="https://cloud.google.com/maps-platform/terms">Map data ©2022 Google</a>', maxZoom: 20.25, subdomains:['mt0','mt1','mt2','mt3'] });

    // Setting the map 

    this.map = L.map('map', {layers: [googleTerrain], zoomSnap: 0.10, zoomDelta: 0.25}).setView([45.2406927,10.27472], 8);
    this.map.options.minZoom = 3;
    L.control.scale({imperial: false}).addTo(this.map);

    var baseLayers = {
      Default: googleTerrain,
      Satellite: L.tileLayer('http://{s}.google.com/vt/lyrs=y,transit,traffic,bike&&x={x}&y={y}&z={z}', {maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: '<a target="_blank" href="https://cloud.google.com/maps-platform/terms">Map data ©2022 Google</a>'}),
      OSM: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 20, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'})
		};
    L.control.layers(baseLayers).addTo(this.map);

    // StreetView button control for map
    
    var streetViewIcon = L.icon({iconUrl: 'https://icon-library.com/images/street-view-icon/street-view-icon-5.jpg', iconSize: [30, 30]}),
        markerIcon = L.icon({iconUrl: 'https://cdn1.iconfinder.com/data/icons/social-messaging-ui-color/254000/66-512.png', iconSize: [30, 30]}),
        flag = true, map = this.map, snackbar = this._snackbar,
      toggle = L.easyButton({
        id: 'toggle-streetview',
        states: [{
          stateName: 'add-markers',
          icon: 'fa-solid fa-street-view fa-xl fa-bounce',
          title: 'Browse Street View Images',
          onClick: function(control) {
              snackbar.open('Double click on map to open StreetView in Google Maps', 'Close', {duration: 5000, verticalPosition: 'bottom', horizontalPosition: 'center', panelClass: ['red-snackbar'],});
              flag = false;
              control.state('remove-markers');
          }
        }, {
          icon: 'fa-solid fa-arrow-rotate-left fa-xl fa-fade',
          title: 'Turn off Street View Mode',
          stateName: 'remove-markers',
          onClick: function(control) {
            snackbar.open('StreetView Mode closed', 'Close', {duration: 2000, verticalPosition: 'bottom', horizontalPosition: 'center', panelClass: ['red-snackbar'],});
            flag = true;
            control.state('add-markers');
          }
        }]
    });
    toggle.addTo(map);

    // StreetView control event

    const tmpl = 'https://www.google.com/maps?layer=c&cbll={lat},{lon}';
    map.on('dblclick', function(e: any) { if (!flag) window.open(tmpl.replace(/{lat}/g, e.latlng.lat).replace(/{lon}/g, e.latlng.lng), '"_self"'); });

    // Double Click on map event

    map.on('dblclick', (e: { latlng: any; }) => {
      if(confirm('Confirm you want to add these coordinates \n' + e.latlng.lat + ', ' + e.latlng.lng + ' ?')) {
        this.latitude = e.latlng.lat;
        this.longitude = e.latlng.lng;
        $('#latitude').val(this.latitude);
        $('#longitude').val(this.longitude);
        this._snackbar.open('Coordinates added', 'Close', {duration: 2000});
      }
    });

    // Base layer change and zoomend events on map

    map.on('baselayerchange', function onOverlayAdd(e: any) { snackbar.open('Layer changed to ' + e.name, 'Close', {duration: 2000}); });
    map.on('zoomend', function onOverlayAdd(e: any) { snackbar.open('Zoom level changed to ' + parseInt(e.sourceTarget._zoom), 'Close', {duration: 100}); });
  }

  public rowClick(e: any): void {
    alert(JSON.stringify(e));
  }

  public showMoreData(): void {
    this.maxNumber += 10;
    this.apiService.findAll(this.maxNumber).subscribe(data => { this.tables = data; });
  }

  public showLessData(): void {
    if(this.maxNumber != 10) {
      this.maxNumber -= 10;
      this.apiService.findAll(this.maxNumber).subscribe(data => { this.tables = data; });
    }
  }
  
  public showAllData(): void {
      this.maxNumber = 687;
      this.apiService.findAll(this.maxNumber).subscribe(data => { this.tables = data; });
  }

  public hideAllData(): void {
      this.maxNumber = 0;
      this.tables = [];
  }

  public saveData(event: any) {
    var snackbar = this._snackbar;
    if(confirm('Are you sure you want to save data?') && this.latitude != null && this.longitude != null && this.searchTerm.value != '' 
        && this.searchMunicipalities.value != '' && this.searchRegions.value != '' && this.searchTerm.value != ''
        && this.address.value != '' && this.goodNaming.value != '') { 
      this.formData.region = this.searchRegions.value;
      this.formData.province = this.searchTerm.value;
      this.formData.municipality = this.searchMunicipalities.value;
      this.formData.address = this.address.value;

      this.formData.number = this.number.value;
      this.formData.goodNaming = this.goodNaming.value;
      this.formData.goodID = this.gooodId.value;
      this.formData.istatCode = this.istatCode.value;

      this.formData.latitude = this.latitude;
      this.formData.longitude = this.longitude;
      
      this.apiService.save(this.formData).subscribe((data: any) => { return data; });
      snackbar.open('Data saved successfully', 'Close', {duration: 3000});
    }
    else {
      snackbar.open('Some problem occured when trying to save data', 'Close', {duration: 3000});
    }
  }

  public focusOutFunction(event: any) {
    if(this.searchMunicipalities.value && this.address.value) {
      $.get('https://nominatim.openstreetmap.org/search?format=json&q=' + this.address.value + ', ' + this.searchMunicipalities.value, (data) => {
        this.map.setView([data[0]['lat'], data[0]['lon']], 17, {"animate": true, "duration": 0.5});
      });
    }
  }
}