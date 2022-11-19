package com.example.beans;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;

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