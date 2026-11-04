package com.bimap.repository;

import module java.base;

import com.bimap.model.AssetForm;
import com.bimap.model.AssetFormRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AssetFormRepository extends JpaRepository<AssetForm, Long> {

    @Query("""
            SELECT new com.bimap.model.AssetFormRow(f.id, f.region, f.province, f.municipality, f.address, f.goodNaming, f.istatCode, f.latitude, f.longitude)
            FROM AssetForm f ORDER BY f.id""")
    List<AssetFormRow> findAllRows();
}
