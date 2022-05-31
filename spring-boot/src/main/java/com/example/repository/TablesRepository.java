package com.example.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.example.beans.Tables;

@Repository
public interface TablesRepository extends JpaRepository<Tables, Long> {
	@Query(value = "SELECT * FROM tables LIMIT :number", nativeQuery = true)
	List<Tables> findAllAndLimitTo(int number);
}