package com.bimap.repository;

import module java.base;

import com.bimap.model.AssetForm;
import com.bimap.model.AssetFormRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;

public interface AssetFormRepository extends JpaRepository<AssetForm, Long> {

    @Query("""
            SELECT new com.bimap.model.AssetFormRow(f.id, f.region, f.province, f.municipality, f.address, f.goodNaming, f.istatCode, f.latitude, f.longitude, f.number, f.goodID)
            FROM AssetForm f WHERE f.id > :after AND f.id <= :through ORDER BY f.id""")
    List<AssetFormRow> findRowsAfter(long after, long through, Pageable pageable);

    @Query("SELECT coalesce(max(f.id), 0) FROM AssetForm f")
    long maximumId();
}
