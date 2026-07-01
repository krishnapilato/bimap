package com.example.beans;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "tables", indexes = {@Index(name = "idx_tables_comune", columnList = "comune"), @Index(name = "idx_tables_prov", columnList = "prov")})
public class Tables {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long idbene;

    private String prov;

    private String comune;

    private String indirizzo;

    private Integer civico;

    private String localizzazione;

    private String denominazione;

    @Column(name = "provv_tutela")
    private String provvTutela;

    @Column(name = "proprieta")
    private String proprieta;

    @Column(name = "catato")
    private String catato;

    private String trascrizione;

    private String vincolo;
}