package com.bimap.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "form")
public class AssetForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String region;

    private String province;

    private String municipality;

    private String address;

    private String goodNaming;

    private int number;

    private int goodID;

    private String istatCode;

    private double latitude;

    private double longitude;

    protected AssetForm() { }

    public AssetForm(String region, String province, String municipality, String address, String goodNaming,
                     int number, int goodID, String istatCode, double latitude, double longitude) {
        this.region = region;
        this.province = province;
        this.municipality = municipality;
        this.address = address;
        this.goodNaming = goodNaming;
        this.number = number;
        this.goodID = goodID;
        this.istatCode = istatCode;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public Long getId() {
        return id;
    }
}
