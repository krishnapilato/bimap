package com.example.repository;

import module java.base;
import com.example.model.ListaComuni;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ListaComuniRepository extends JpaRepository<ListaComuni, Long> {

    @Query("SELECT DISTINCT c.regione FROM ListaComuni c WHERE LOWER(c.regione) LIKE LOWER(CONCAT('%', :keyword, '%')) ORDER BY c.regione LIMIT 4")
    List<String> searchRegion(@Param("keyword") String keyword);

    @Query("SELECT DISTINCT c.provincia FROM ListaComuni c WHERE LOWER(c.provincia) LIKE LOWER(CONCAT('%', :keyword, '%')) ORDER BY c.provincia LIMIT 4")
    List<String> searchProvince(@Param("keyword") String keyword);

    @Query("SELECT DISTINCT c.comune FROM ListaComuni c WHERE LOWER(c.comune) LIKE LOWER(CONCAT('%', :keyword, '%')) ORDER BY c.comune LIMIT 4")
    List<String> searchMunicipality(@Param("keyword") String keyword);
}
