import { FormModel } from './formdata';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import * as $ from "jquery";
import { ApiService } from './api.service';
import * as L from 'leaflet';
import 'leaflet-easybutton';
import 'leaflet-easybutton/src/easy-button.css';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [ApiService]
})

export class AppComponent implements OnInit {

  // FormControl attributes

  public searchTerm : FormControl = new FormControl();
  public searchMunicipalities : FormControl = new FormControl();
  public searchRegions : FormControl = new FormControl();
  public address : FormControl = new FormControl();
  public number : FormControl = new FormControl();
  public goodNaming : FormControl = new FormControl();
  public gooodId : FormControl = new FormControl();
  public idVir : FormControl = new FormControl();
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

  // Constructor 
  
  constructor(private apiService: ApiService, private _snackbar: MatSnackBar) {}

  // OnInit method

  ngOnInit() {

    // Get autocomplete search data for regions

    this.searchRegions.valueChanges.subscribe(term => {
      if (term != '' && term.length > 0) this.apiService.searchRegions(term).subscribe((data: any[]) => { this.provinces = data as any[]; });
      else this.provinces = [];
    });

    // Get autocomplete search data for provinces

    this.searchTerm.valueChanges.subscribe(term => {
      this.provinces = [];
      if (term != '' && term.length > 0) this.apiService.searchProvinces(term).subscribe((data: any[]) => { this.provinces = data as any[]; });
      else this.provinces = [];
    });

    // Get autocomplete search data for municipalities

    this.searchMunicipalities.valueChanges.subscribe(term => {
      if (term != '' && term.length > 0) this.apiService.searchMunicipalities(term).subscribe((data: any[]) => { this.provinces = data as any[]; });
      else this.provinces = [];
    });

    // Default layer for map

    var googleTerrain = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {noWrap: true, attribution: '<a target="_blank" href="https://www.google.com/intl/en_it/help/terms_maps">Map data ©2022 Google</a>', maxZoom: 20.5, subdomains:['mt0','mt1','mt2','mt3'] });

    // Setting the map 

    this.map = L.map('map', {layers: [googleTerrain], zoomSnap: 0.10, zoomDelta: 0.25}).setView([45.2406927,10.27472], 8);
    this.map.options.minZoom = 3;
    L.control.scale({imperial: false}).addTo(this.map);

    // Custom base layers for map

    var baseLayers = {
      Terrain: googleTerrain,
      Satellite: L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {maxZoom: 20.5, noWrap: true, subdomains:['mt0','mt1','mt2','mt3'], attribution: '<a target="_blank" href="https://www.google.com/intl/en_it/help/terms_maps">Map data ©2022 Google</a>'}),
      OSM: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 20, noWrap: true, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'})
		};
    L.control.layers(baseLayers).addTo(this.map);

    // StreetView button control for map
    
    var markerIcon = L.icon({iconUrl: 'https://cdn1.iconfinder.com/data/icons/social-messaging-ui-color/254000/66-512.png', iconSize: [30, 30]}),
    flag = true, map = this.map, snackbar = this._snackbar,
		toggle = L.easyButton({
        id: 'toggle-streetview',
        states: [{
          stateName: 'add-markers',
          icon: 'fa-solid fa-street-view fa-lg',
          title: 'Turn on Street View Mode',
          onClick: function(control) {
              snackbar.open('One click on map to open StreetView in Google Maps', 'Close', {duration: 5000, verticalPosition: 'bottom', horizontalPosition: 'end', panelClass: ['red-snackbar'],});
              flag = false;
              control.state('remove-markers');
          }
        }, {
          icon: 'fa-solid fa-arrow-rotate-left',
          title: 'Turn off Street View Mode',
          stateName: 'remove-markers',
          onClick: function(control) {
            snackbar.open('StreetView Mode closed', '', {duration: 2000, verticalPosition: 'bottom', horizontalPosition: 'end', panelClass: ['red-snackbar'],});
            flag = true;
            control.state('add-markers');
          }
        }]
    });
    toggle.addTo(map);

    // StreetView control event

    const tmpl = 'https://www.google.com/maps?layer=c&cbll={lat},{lon}';
    map.on('click', function(e: any) { 
      if (!flag) { 
        window.open(tmpl.replace(/{lat}/g, e.latlng.lat).replace(/{lon}/g, e.latlng.lng), '"_self"'); 
      }
    });

    // Double Click on map event

    map.on('dblclick', (e: { latlng: any; }) => {
      if(confirm('Confirm you want to add these coordinates \n' + e.latlng.lat + ', ' + e.latlng.lng + ' ?')) {
        L.marker([e.latlng.lat, e.latlng.lng], {icon: markerIcon}).addTo(map);
        this.latitude = e.latlng.lat;
        this.longitude = e.latlng.lng;
        $('#latitude').val(this.latitude);
        $('#longitude').val(this.longitude);
      }
    });
  }

  public saveData(event: any) {
    if(confirm('Are you sure you want to save data?')) {
      this.formData.region = this.searchRegions.value;
      this.formData.province = this.searchTerm.value;
      this.formData.municipality = this.searchMunicipalities.value;
      this.formData.address = this.address.value;

      this.formData.number = this.number.value;
      this.formData.goodNaming = this.goodNaming.value;
      this.formData.goodID = this.gooodId.value;
      this.formData.idVir = this.idVir.value;

      this.formData.latitude = this.latitude;
      this.formData.longitude = this.longitude;
      
      this.apiService.save(this.formData).subscribe((data: any) => { return data; });
      var snackbar = this._snackbar;
      snackbar.open('Data saved successfully', 'Close', {duration: 3000, verticalPosition: 'bottom', horizontalPosition: 'end', panelClass: ['red-snackbar'],});
    }
  }

  public focusOutFunction(event: any) {
    if(this.searchMunicipalities.value && this.address.value) {
      $.get('https://nominatim.openstreetmap.org/search?format=json&q=' + this.address.value + ', ' + this.searchMunicipalities.value, (data) => {
        this.map.setView([data[0]['lat'], data[0]['lon']], 17, {"animate": true, "duration": 1});
      });
    }
  }
}