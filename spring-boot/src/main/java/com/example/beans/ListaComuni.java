package com.example.beans;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "listacomuni", indexes = {@Index(name = "idx_comuni_comune", columnList = "comune"), @Index(name = "idx_comuni_regione", columnList = "regione"), @Index(name = "idx_comuni_provincia", columnList = "provincia")})
public class ListaComuni {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String comune;

    private String regione;

    private String provincia;
}