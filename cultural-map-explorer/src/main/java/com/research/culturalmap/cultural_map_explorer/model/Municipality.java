package com.research.culturalmap.cultural_map_explorer.model;

import jakarta.persistence.*;
import lombok.Data;

/**
 * Represents an entity containing details of municipalities, regions, and provinces.
 */
@Data
@Entity
@Table(name = "municipalities")
public class Municipality {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String municipality;

    @Column(nullable = false, length = 100)
    private String region;

    @Column(nullable = false, length = 100)
    private String province;
}