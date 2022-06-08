package com.example.repository;

import java.util.Date;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.example.beans.User;
import com.example.enums.ApplicationRole;
import com.example.enums.UserStatus;

@Transactional
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
	@Query("SELECT u FROM User u WHERE u.email = :emailAddress")
	Optional<User> findByEmailAddress(String emailAddress);

	@Query("SELECT u FROM User u WHERE u.userStatus = :userStatus AND u.created < :created")
	Page<User> findExpired(UserStatus userStatus, Date created, Pageable pageable);
	
	@Modifying
	@Query("UPDATE User u SET u.surname = :surname, u.name = :name, u.email = :email, u.applicationRole = :applicationRole WHERE u.email = :emailID")
	void update(String surname, String name, String email, ApplicationRole applicationRole, String emailID);
}