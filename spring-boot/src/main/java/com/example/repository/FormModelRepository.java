package com.example.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;

import com.example.beans.*;

@Repository 
public interface FormModelRepository extends JpaRepository<FormModel, Long> {}