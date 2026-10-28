package com.example.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "form")
public class FormModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank @Size(max = 255)
    private String region;
    @NotBlank @Size(max = 255)
    private String province;
    @NotBlank @Size(max = 255)
    private String municipality;
    @NotBlank @Size(max = 255)
    private String address;
    @NotBlank @Size(max = 255)
    private String goodNaming;
    private int number;
    private int goodID;
    @Pattern(regexp = "\\d{6}", message = "must be 6 digits")
    @Column(length = 6)
    private String istatCode;
    @DecimalMin("-90") @DecimalMax("90")
    private double latitude;
    @DecimalMin("-180") @DecimalMax("180")
    private double longitude;
}
