package com.example.beans;

import java.util.Date;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;

import com.example.core.ApplicationRole;

import lombok.Data;

/**
 * Class for application user.
 * 
 */
@Data
@Entity
@Table(name = "users")
public class User {
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private Long id;

	private String name;
	private String surname;
	@Column(unique = true, length = 256)
	private String email;
	private String password;
	@Column(name = "user_status")
	private UserStatus userStatus;
	@Column(name = "application_role")
	private ApplicationRole applicationRole;

	private Date created;
	@Column(name = "last_modified")
	private Date lastModified;
}