package com.example.beans;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "tables")
public class Tables {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	private Long idbene;
	private String prov, comune, indirizzo;
	private int civico;
	private String localizzazione, denominazione, provv_tutela, proprietà, catato, trascrizione, vincolo;
}