import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FormModel } from './formdata';
import * as L from 'leaflet';
import * as $ from 'jquery';
import { MatSnackBar } from '@angular/material/snack-bar';
import 'leaflet-easybutton';
import { ApiService } from './api.service';
import { MatTableDataSource } from '@angular/material/table';
import { Tables } from './tables';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'main-app',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
  providers: [ApiService]
})
export class MainComponent implements OnInit {
  // Table attributes

  displayedColumns: string[] = ['id', 'prov', 'comune', 'indirizzo', 'civico'];
  dataSource = new MatTableDataSource<Tables>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // FormControl attributes

  public searchTerm: FormControl = new FormControl();
  public searchMunicipalities: FormControl = new FormControl();
  public searchRegions: FormControl = new FormControl();
  public address: FormControl = new FormControl();
  public number: FormControl = new FormControl();
  public goodNaming: FormControl = new FormControl();
  public gooodId: FormControl = new FormControl();
  public istatCode: FormControl = new FormControl();
  public ilatitude: FormControl = new FormControl();
  public ilongitude: FormControl = new FormControl();
  public formData = new FormModel();
  public results!: any;
  public user: any;
  public playerName!: string;

  // provinces attribute for getting autcomplete search data

  public provinces = <any>[];

  // map attribute for leaflet map

  private map: any;

  // latitude and longitude attributes for map

  public latitude!: number;
  public longitude!: number;

  isShown!: boolean;

  constructor(
    private apiService: ApiService,
    private _snackbar: MatSnackBar,
    private authenticationService: AuthService
  ) {}

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnInit() {
    this.isShown = false;
    this.user = this.authenticationService.loginResponseValue;

    // get all table data from ApiService

    this.apiService.findAll().subscribe(data => {
      this.dataSource.data = data;
    });

    // Get autocomplete search data for regions

    this.searchRegions.valueChanges.subscribe(term => {
      if (term != '' && term.length > 0)
        this.apiService.searchRegions(term).subscribe((data: any[]) => {
          this.provinces = data as any[];
        });
      else this.provinces = [];
    });

    // Get autocomplete search data for provinces

    this.searchTerm.valueChanges.subscribe(term => {
      if (term != '' && term.length > 0)
        this.apiService.searchProvinces(term).subscribe((data: any[]) => {
          this.provinces = data as any[];
        });
      else this.provinces = [];
    });

    // Get autocomplete search data for municipalities

    this.searchMunicipalities.valueChanges.subscribe(term => {
      if (term != '' && term.length > 0)
        this.apiService.searchMunicipalities(term).subscribe((data: any[]) => {
          this.provinces = data as any[];
        });
      else this.provinces = [];
    });

    // Default layer for map

    var googleTerrain = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m@221097413,transit&x={x}&y={y}&z={z}',
      {
        attribution:
          '<a target="_blank" href="https://cloud.google.com/maps-platform/terms">Map data ©2022 Google</a>',
        maxZoom: 20.25,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }
    );

    var googleStreetViewLayer = L.tileLayer(
      'https://{s}.google.com/vt/?lyrs=svv|cb_client:apiv3&style=50&x={x}&y={y}&z={z}',
      {
        attribution:
          '<a target="_blank" href="https://cloud.google.com/maps-platform/terms">Map data ©2022 Google</a>',
        maxZoom: 20.25,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }
    );

    var cities = L.layerGroup([googleTerrain, googleStreetViewLayer]);

    // Setting the map

    this.map = L.map('map', {
      layers: [googleTerrain],
      zoomSnap: 0.1,
      zoomDelta: 0.25
    }).setView([45.2406927, 10.27472], 8);
    this.map.options.minZoom = 3;
    L.control.scale({ imperial: false }).addTo(this.map);

    var baseLayers = {
      Default: googleTerrain,
      Satellite: L.tileLayer(
        'http://{s}.google.com/vt/lyrs=y,transit&&x={x}&y={y}&z={z}',
        {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution:
            '<a target="_blank" href="https://cloud.google.com/maps-platform/terms">Map data ©2022 Google</a>'
        }
      ),
      OSM: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      })
    };
    L.control.layers(baseLayers).addTo(this.map);

    // StreetView button control for map

    var flag = true,
      map = this.map,
      snackbar = this._snackbar,
      toggle = L.easyButton({
        id: 'toggle-streetview',
        states: [
          {
            stateName: 'add-markers',
            icon: 'fa-solid fa-street-view fa-xl fa-bounce',
            title: 'Browse Street View Images',
            onClick: function(control) {
              if (map.getZoom() > 14) {
                cities.addTo(map);
                snackbar.open(
                  'Double click on map to open StreetView in Google Maps',
                  'Close',
                  {
                    duration: 5000
                  }
                );
                flag = false;
                control.state('remove-markers');
              } else {
                snackbar.open(
                  'Zoom more in to enable Street View Mode',
                  'Close',
                  { duration: 2000 }
                );
              }
            }
          },
          {
            icon: 'fa-solid fa-arrow-rotate-left fa-xl fa-fade',
            title: 'Turn off Street View Mode',
            stateName: 'remove-markers',
            onClick: function(control) {
              map.removeLayer(cities);
              map.addLayer(googleTerrain);
              snackbar.open('StreetView Mode closed', 'Close', {
                duration: 2000
              });
              flag = true;
              control.state('add-markers');
            }
          }
        ]
      });
    toggle.addTo(map);

    // StreetView control event

    const tmpl = 'https://www.google.com/maps?layer=c&cbll={lat},{lon}';
    map.on('dblclick', function(e: any) {
      if (!flag) {
        var t!: any;
        t = window.open(
          tmpl.replace(/{lat}/g, e.latlng.lat).replace(/{lon}/g, e.latlng.lng),
          '"_self"'
        );
        console.log(
          tmpl.replace(/{lat}/g, e.latlng.lat).replace(/{lon}/g, e.latlng.lng)
        );
      }
    });

    // Double Click on map event

    map.on('dblclick', (e: { latlng: any }) => {
      if (
        confirm(
          'Confirm you want to add these coordinates \n' +
            e.latlng.lat +
            ', ' +
            e.latlng.lng +
            ' ?'
        )
      ) {
        this.latitude = e.latlng.lat;
        this.longitude = e.latlng.lng;
        $('#latitude').val(this.latitude);
        $('#longitude').val(this.longitude);
        this._snackbar.open('Coordinates added', 'Close', { duration: 2000 });
      }
    });

    // Base layer change and zoomend events on map

    map.on('baselayerchange', function onOverlayAdd(e: any) {
      snackbar.open('Layer changed to ' + e.name, 'Close', { duration: 2000 });
    });
  }

  toggleShow() {
    this.isShown = !this.isShown;
  }
  streetView() {
    const variable =
      'https://www.google.com/maps/embed?pb=!4v1!6m8!1m7!{id}!2m2!1d45.04245303557875!2d8.948897843681799!3f0!4f0!5f0';
    const URL = variable.replace(/{id}/g, this.playerName);
    $('#iframee').attr('src', URL);
  }

  saveData(event: any) {
    var snackbar = this._snackbar;
    if (
      confirm('Are you sure you want to save data?') &&
      this.latitude != null &&
      this.longitude != null &&
      this.searchTerm.value != '' &&
      this.searchMunicipalities.value != '' &&
      this.searchRegions.value != '' &&
      this.searchTerm.value != '' &&
      this.address.value != '' &&
      this.goodNaming.value != ''
    ) {
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

      this.apiService.save(this.formData).subscribe((data: any) => {
        return data;
      });
      snackbar.open('Data saved successfully', 'Close', { duration: 3000 });
    } else {
      snackbar.open('Some problem occured when trying to save data', 'Close', {
        duration: 3000
      });
    }
  }

  getRecord(row: any): void {
    this._snackbar.open('Data inserted successfully', 'Close', {
      duration: 3000
    });
    $('#municipality').val(row.comune);
    $('#address').val(row.indirizzo);
    $('#streetnumber').val(row.civico);
    $('html, body').animate({ scrollTop: 0 }, 1000);
    $.get(
      'https://nominatim.openstreetmap.org/search?format=json&q=' +
        row.comune +
        ', ' +
        row.indirizzo,
      data => {
        this.map.setView([data[0]['lat'], data[0]['lon']], 17, {
          animate: true,
          duration: 0.5
        });
      }
    );
  }

  focusOutFunction(event: any) {
    if (this.searchMunicipalities.value && this.address.value) {
      $.get(
        'https://nominatim.openstreetmap.org/search?format=json&q=' +
          this.address.value +
          ', ' +
          this.searchMunicipalities.value,
        data => {
          this.map.setView([data[0]['lat'], data[0]['lon']], 17, {
            animate: true,
            duration: 0.5
          });
        }
      );
    }
  }
}
