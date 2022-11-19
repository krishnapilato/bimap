import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import * as $ from 'jquery';
import * as L from 'leaflet';
import 'leaflet-easybutton';
import { AuthService } from '../auth/auth.service';
import { LoginResponse } from '../auth/loginresponse';
import { ApiService } from './api.service';
import { FormModel } from './formdata';
import { Tables } from './tables';

@Component({
  selector: 'main-app',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
  providers: [ApiService],
})
export class MainComponent implements OnInit {
  public displayedColumns: string[] = [
    'id',
    'prov',
    'comune',
    'indirizzo',
    'civico',
  ];
  public dataSource = new MatTableDataSource<Tables>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  public searchTerm: UntypedFormControl = new UntypedFormControl();
  public searchMunicipalities: UntypedFormControl = new UntypedFormControl();
  public searchRegions: UntypedFormControl = new UntypedFormControl();
  public address: UntypedFormControl = new UntypedFormControl();
  public number: UntypedFormControl = new UntypedFormControl();
  public goodNaming: UntypedFormControl = new UntypedFormControl();
  public gooodId: UntypedFormControl = new UntypedFormControl();
  public istatCode: UntypedFormControl = new UntypedFormControl();
  public ilatitude: UntypedFormControl = new UntypedFormControl();
  public ilongitude: UntypedFormControl = new UntypedFormControl();
  public formData = new FormModel();
  public results!: any;
  public user!: LoginResponse;
  public playerName!: string;

  public provinces = <any>[];

  private map!: L.Map;

  public latitude!: number;
  public longitude!: number;

  public isShown!: boolean;

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

    this.apiService.findAll().subscribe((data) => {
      this.dataSource.data = data;
    });

    this.searchRegions.valueChanges.subscribe((term) => {
      if (term != '' && term.length > 0)
        this.apiService.searchRegions(term).subscribe((data: any[]) => {
          this.provinces = data as any[];
        });
      else this.provinces = [];
    });

    this.searchTerm.valueChanges.subscribe((term) => {
      if (term != '' && term.length > 0)
        this.apiService.searchProvinces(term).subscribe((data: any[]) => {
          this.provinces = data as any[];
        });
      else this.provinces = [];
    });

    this.searchMunicipalities.valueChanges.subscribe((term) => {
      if (term != '' && term.length > 0)
        this.apiService.searchMunicipalities(term).subscribe((data: any[]) => {
          this.provinces = data as any[];
        });
      else this.provinces = [];
    });

    var googleTerrain = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m@221097413,transit&x={x}&y={y}&z={z}',
      {
        attribution:
          '<a target="_blank" href="https://cloud.google.com/maps-platform/terms">Map data ©2022 Google</a>',
        maxZoom: 20.25,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      }
    );

    var googleStreetViewLayer = L.tileLayer(
      'https://{s}.google.com/vt/?lyrs=svv|cb_client:apiv3&style=50&x={x}&y={y}&z={z}',
      {
        attribution:
          '<a target="_blank" href="https://cloud.google.com/maps-platform/terms">Map data ©2022 Google</a>',
        maxZoom: 20.25,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      }
    );

    var cities = L.layerGroup([googleTerrain, googleStreetViewLayer]);

    this.map = L.map('map', {
      layers: [googleTerrain],
      zoomSnap: 0.1,
      zoomDelta: 0.25,
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
            '<a target="_blank" href="https://cloud.google.com/maps-platform/terms">Map data ©2022 Google</a>',
        }
      ),
      OSM: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }),
    };
    L.control.layers(baseLayers).addTo(this.map);

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
            onClick: function (control) {
              $('.leaflet-control-layers').hide();
              cities.addTo(map);
              snackbar.open(
                'Double click on map to open StreetView in Google Maps',
                'Close',
                {
                  duration: 5000,
                }
              );
              flag = false;
              control.state('remove-markers');
            },
          },
          {
            icon: 'fa-solid fa-arrow-rotate-left fa-xl fa-fade',
            title: 'Turn off Street View Mode',
            stateName: 'remove-markers',
            onClick: function (control) {
              $('.leaflet-control-layers').show();
              map.removeLayer(cities);
              map.addLayer(googleTerrain);
              snackbar.open('StreetView Mode closed', 'Close', {
                duration: 2000,
              });
              flag = true;
              control.state('add-markers');
            },
          },
        ],
      });
    toggle.addTo(map);

    const tmpl = 'https://www.google.com/maps?layer=c&cbll={lat},{lon}';
    map.on('dblclick', function (e: any) {
      if (!flag) {
        window.open(
          tmpl.replace(/{lat}/g, e.latlng.lat).replace(/{lon}/g, e.latlng.lng),
          '"_self"'
        );
      }
    });

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

    map.on('baselayerchange', function onOverlayAdd(e: any) {
      snackbar.open('Layer changed to ' + e.name, 'Close', { duration: 2000 });
    });
  }

  scrollToTop() {
    $('html, body').animate({ scrollTop: 0 }, 10);
  }

  toggleShow() {
    this.isShown = !this.isShown;
    if (this.isShown) {
      $('html,body').animate(
        { scrollTop: document.body.scrollHeight + 53 },
        'fast'
      );
      this._snackbar.open('StreetView Map is now visible below', 'Close', {
        duration: 2000,
      });
    } else {
      this._snackbar.open('StreetView Map is now hidden', 'Close', {
        duration: 2000,
      });
    }
  }

  saveData() {
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

      this.apiService.save(this.formData).subscribe((data: any) => {});
      snackbar.open('Data saved successfully', 'Close', { duration: 3000 });
    } else {
      snackbar.open('Some problem occured when trying to save data', 'Close', {
        duration: 3000,
      });
    }
  }

  getRecord(row: any): void {
    this._snackbar.open('Data inserted successfully', 'Close', {
      duration: 3000,
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
      (data) => {
        this.map.setView([data[0]['lat'], data[0]['lon']], 17, {
          animate: true,
          duration: 0.5,
        });
      }
    );
  }

  focusOutFunction() {
    if (this.searchMunicipalities.value && this.address.value) {
      $.get(
        'https://nominatim.openstreetmap.org/search?format=json&q=' +
          this.address.value +
          ', ' +
          this.searchMunicipalities.value,
        (data) => {
          this.map.setView([data[0]['lat'], data[0]['lon']], 17, {
            animate: true,
            duration: 0.5,
          });
        }
      );
    }
  }
}
