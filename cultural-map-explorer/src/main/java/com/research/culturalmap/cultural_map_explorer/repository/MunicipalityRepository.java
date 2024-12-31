package com.research.culturalmap.cultural_map_explorer.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.research.culturalmap.cultural_map_explorer.model.Municipality;

/**
 * Repository interface for performing CRUD operations and custom queries on the Municipality entity.
 */
@Repository
public interface MunicipalityRepository extends JpaRepository<Municipality, Long> {

    /**
     * Searches regions by a keyword, returning up to 4 distinct results in ascending order.
     *
     * @param keyword The search keyword.
     * @return A list of distinct matching regions.
     */
    @Query(value = "SELECT DISTINCT region FROM municipalities WHERE region LIKE %:keyword% ORDER BY region ASC LIMIT 4", nativeQuery = true)
    List<String> searchRegion(String keyword);

    /**
     * Searches provinces by a keyword, returning up to 4 distinct results in ascending order.
     *
     * @param keyword The search keyword.
     * @return A list of distinct matching provinces.
     */
    @Query(value = "SELECT DISTINCT province FROM municipalities WHERE province LIKE %:keyword% ORDER BY province ASC LIMIT 4", nativeQuery = true)
    List<String> searchProvince(String keyword);

    /**
     * Searches municipalities by a keyword, returning up to 4 results in ascending order.
     *
     * @param keyword The search keyword.
     * @return A list of matching municipalities.
     */
    @Query(value = "SELECT municipality FROM municipalities WHERE municipality LIKE %:keyword% ORDER BY municipality ASC LIMIT 4", nativeQuery = true)
    List<String> searchMunicipality(String keyword);
}