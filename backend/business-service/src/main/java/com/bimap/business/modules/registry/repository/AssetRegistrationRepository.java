package com.bimap.business.modules.registry.repository;

import com.bimap.business.modules.registry.domain.AssetRegistration;
import com.bimap.business.modules.registry.domain.RegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

/// @author Khova Krishna Pilato
public interface AssetRegistrationRepository
        extends JpaRepository<AssetRegistration, Long>, JpaSpecificationExecutor<AssetRegistration> {

    Optional<AssetRegistration> findByPublicId(String publicId);

    boolean existsByIstatCodeAndAddressIgnoreCaseAndHouseNumberIgnoreCaseAndAssetNameIgnoreCase(
            String istatCode, String address, String houseNumber, String assetName);

    @Query("SELECT r.status, COUNT(r) FROM AssetRegistration r GROUP BY r.status")
    List<Object[]> countByStatus();

    @Query("SELECT r.region, COUNT(r) FROM AssetRegistration r GROUP BY r.region ORDER BY COUNT(r) DESC")
    List<Object[]> countByRegion();

    long countByStatus(RegistrationStatus status);
}
