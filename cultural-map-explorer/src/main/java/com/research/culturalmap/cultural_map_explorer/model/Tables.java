package com.research.culturalmap.cultural_map_explorer.model;

import jakarta.persistence.*;
import lombok.Data;

/**
 * Represents an entity containing details about cultural goods and their attributes.
 */
@Data
@Entity
@Table(name = "tables")
public class Tables {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_bene", nullable = false)
    private Long goodId;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(name = "constraint_info", nullable = true, length = 200)
    private String constraintInfo;

    @Column(name = "land_registry", nullable = true, length = 200)
    private String landRegistry;

    @Column(nullable = false, length = 255)
    private String localization;

    @Column(nullable = false, length = 100)
    private String municipality;

    @Column(nullable = false, length = 200)
    private String naming;

    @Column(name = "ownership", nullable = true, length = 200)
    private String ownership;

    @Column(name = "provv_tutela", nullable = true, length = 200)
    private String protectionProvision;

    @Column(nullable = false, length = 100)
    private String province;

    @Column(name = "street_number", nullable = false)
    private int streetNumber;

    @Column(name = "transcription", nullable = true, length = 200)
    private String transcription;
}