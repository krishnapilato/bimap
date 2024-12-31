package com.research.culturalmap.cultural_map_explorer.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.research.culturalmap.cultural_map_explorer.model.Tables;

/**
 * Repository interface for performing CRUD operations on the Tables entity.
 */
@Repository
public interface TablesRepository extends JpaRepository<Tables, Long> { }