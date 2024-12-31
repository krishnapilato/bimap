package com.research.culturalmap.cultural_map_explorer.repository;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import com.research.culturalmap.cultural_map_explorer.model.FormModel;

/**
 * Repository interface for performing CRUD operations on the FormModel entity.
 */
@Repository
public interface FormModelRepository extends CrudRepository<FormModel, Long> { }