package com.example.repository;

import java.util.Date;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.example.beans.User;
import com.example.beans.UserStatus;

public interface UserRepository extends JpaRepository<User, Long> {
	@Query("select u from User u where u.email = ?1")
	Optional<User> findByEmailAddress(String emailAddress);

	@Query("select u from User u where u.userStatus = ?1 AND u.created < ?2")
	Page<User> findExpired(UserStatus userStatus, Date created, Pageable pageable);
}