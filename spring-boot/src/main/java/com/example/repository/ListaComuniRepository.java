package com.example.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.example.beans.ListaComuni;

@Repository 
public interface ListaComuniRepository extends JpaRepository<ListaComuni, Long> {
	@Query(value = "SELECT DISTINCT regione FROM listacomuni WHERE regione LIKE %:keyword% ORDER BY regione ASC LIMIT 4", nativeQuery = true)
	List<String> searchRegione(String keyword);
	
	@Query(value = "SELECT DISTINCT provincia FROM listacomuni WHERE provincia LIKE %:keyword% ORDER BY provincia ASC LIMIT 4", nativeQuery = true)
	List<String> searchProvincia(String keyword);
	
	@Query(value = "SELECT comune FROM listacomuni WHERE comune LIKE %:keyword% ORDER BY comune ASC LIMIT 4", nativeQuery = true)
	List<String> searchComune(String keyword);
}