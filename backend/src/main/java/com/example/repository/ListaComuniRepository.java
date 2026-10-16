package com.example.repository;

import module java.base;
import com.example.model.ListaComuni;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ListaComuniRepository extends JpaRepository<ListaComuni, Long> {

    @Query("SELECT DISTINCT c.regione FROM ListaComuni c WHERE c.regione LIKE %:keyword% ORDER BY c.regione LIMIT 4")
    List<String> searchRegion(String keyword);

    @Query("SELECT DISTINCT c.provincia FROM ListaComuni c WHERE c.provincia LIKE %:keyword% ORDER BY c.provincia LIMIT 4")
    List<String> searchProvince(String keyword);

    @Query("SELECT DISTINCT c.comune FROM ListaComuni c WHERE c.comune LIKE %:keyword% ORDER BY c.comune LIMIT 4")
    List<String> searchMunicipality(String keyword);
}
