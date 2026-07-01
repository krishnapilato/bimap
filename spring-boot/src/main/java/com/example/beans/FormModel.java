package com.example.beans;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "form", indexes = {@Index(name = "idx_form_region", columnList = "region"), @Index(name = "idx_form_province", columnList = "province"), @Index(name = "idx_form_municipality", columnList = "municipality")})
public class FormModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String region;

    private String province;

    private String municipality;

    private String address;

    private String goodNaming;

    private Integer number;

    private Integer goodID;

    private Integer istatCode;

    private Double latitude;

    private Double longitude;
}