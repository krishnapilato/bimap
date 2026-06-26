package com.example.beans;

import java.util.Date;

import com.example.enums.ApplicationRole;
import com.example.enums.UserStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "users")
public class User {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String name, surname;
	@Column(name = "full_name", nullable = false)
	private String fullName;
	@Column(unique = true, length = 256)
	private String email;
	private String password;
	@Column(name = "user_status")
	private UserStatus userStatus;
	@Column(name = "application_role")
	private ApplicationRole applicationRole;

	@Column(name = "created_at", nullable = false)
	private Date created;
	@Column(name = "updated_at", nullable = false)
	private Date lastModified;
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
	@PreUpdate
	private void updateFullName() {
		String firstName = name == null ? "" : name.trim();
		String lastName = surname == null ? "" : surname.trim();
		fullName = (firstName + " " + lastName).trim();
	}
}
