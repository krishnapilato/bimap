package com.example.repository;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import com.example.beans.*;

@Repository 
public interface FormModelRepository extends CrudRepository<FormModel, Long> {}