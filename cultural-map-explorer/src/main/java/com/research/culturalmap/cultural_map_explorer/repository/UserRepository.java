package com.research.culturalmap.cultural_map_explorer.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.research.culturalmap.cultural_map_explorer.model.User;
import com.research.culturalmap.cultural_map_explorer.enums.ApplicationRole;

/**
 * Repository interface for performing CRUD operations and custom queries on the User entity.
 */
@Transactional
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Finds a user by their email address.
     *
     * @param emailAddress The email address to search for.
     * @return An Optional containing the User if found, otherwise empty.
     */
    @Query("SELECT u FROM User u WHERE u.email = :emailAddress")
    Optional<User> findByEmailAddress(String emailAddress);

    /**
     * Finds users with a specific status that were created before a given timestamp.
     *
     * @param applicationRole The role to filter by.
     * @param created The cutoff creation timestamp.
     * @param pageable The pagination information.
     * @return A paginated list of users matching the criteria.
     */
    @Query("SELECT u FROM User u WHERE u.applicationRole = :applicationRole AND u.created < :created")
    Page<User> findExpired(ApplicationRole applicationRole, Instant created, Pageable pageable);

    /**
     * Finds a user by their email.
     *
     * @param email The email to search for.
     * @return An Optional containing the User if found, otherwise empty.
     */
    Optional<User> findByEmail(String email);

    /**
     * Updates the user's information.
     *
     * @param surname The new surname.
     * @param name The new name.
     * @param email The new email address.
     * @param applicationRole The new role.
     * @param emailID The existing email to identify the user.
     */
    @Modifying
    @Query("UPDATE User u SET u.surname = :surname, u.name = :name, u.email = :email, u.applicationRole = :applicationRole WHERE u.email = :emailID")
    void update(String surname, String name, String email, ApplicationRole applicationRole, String emailID);
}