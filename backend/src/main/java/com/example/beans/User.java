package com.example.beans;

import com.example.enums.ApplicationRole;
import com.example.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "users", indexes = {@Index(name = "idx_user_email", columnList = "email")})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String surname;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(unique = true, length = 256, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_status")
    private UserStatus userStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "application_role")
    private ApplicationRole applicationRole;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant created;

    @Column(name = "updated_at", nullable = false)
    private Instant lastModified;

    @Column(name = "`key`", unique = true)
    private String key;

    @Column(name = "account_non_expired", nullable = false)
    private boolean accountNonExpired = true;

    @Column(name = "account_non_locked", nullable = false)
    private boolean accountNonLocked = true;

    @Column(nullable = false)
    private boolean locked = false;

    @Column(name = "credentials_non_expired", nullable = false)
    private boolean credentialsNonExpired = true;

    @Column(nullable = false)
    private boolean enabled = true;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();

        if (created == null) {
            created = now;
        }
        lastModified = now;

        computeFullName();
    }

    @PreUpdate
    protected void onUpdate() {
        lastModified = Instant.now();
        computeFullName();
    }

    private void computeFullName() {
        String first = name == null ? "" : name.trim();
        String last = surname == null ? "" : surname.trim();
        this.fullName = (first + " " + last).trim();
    }
}