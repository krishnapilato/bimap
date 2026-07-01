package com.example.repository;

import com.example.beans.FormModel;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FormModelRepository extends CrudRepository<FormModel, Long> { }