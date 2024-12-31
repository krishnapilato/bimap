package com.research.culturalmap.cultural_map_explorer.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Represents a form entity containing information about cultural goods.
 *
 * This model is mapped to the database table `form` and includes fields
 * for storing location, naming, and identification details.
 */
@Data
@Entity
@Table(name = "form")
public class FormModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 100)
    private String region;

    @NotBlank
    @Size(max = 100)
    private String province;

    @NotBlank
    @Size(max = 100)
    private String municipality;

    @NotBlank
    @Size(max = 255)
    private String address;

    @NotBlank
    @Size(max = 200)
    private String goodNaming;

    @NotNull
    private int number;

    @NotNull
    private int goodID;

    @NotNull
    private int istatCode;

    @NotNull
    private double latitude;

    @NotNull
    private double longitude;
}