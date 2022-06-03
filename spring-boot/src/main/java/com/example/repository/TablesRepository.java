package com.example.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.beans.Tables;

@Repository
public interface TablesRepository extends JpaRepository<Tables, Long> {
}