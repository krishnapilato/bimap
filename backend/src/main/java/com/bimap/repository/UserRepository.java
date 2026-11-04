package com.bimap.repository;

import module java.base;

import com.bimap.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    long countByRoleAndEnabledTrueAndLockedFalse(User.Role role);
}
