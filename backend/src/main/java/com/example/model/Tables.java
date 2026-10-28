package com.example.model;


import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "tables")
public class Tables {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long idbene;
    private String prov;
    private String comune;
    private String indirizzo;
    private int civico;
    private String localizzazione;
    private String denominazione;
    private String provvTutela;
    private String proprieta;
    private String catato;
    private String trascrizione;
    private String vincolo;
}
