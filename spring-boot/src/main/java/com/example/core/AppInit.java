package com.example.core;

import java.util.Date;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.example.beans.User;
import com.example.enums.ApplicationRole;
import com.example.enums.UserStatus;
import com.example.repository.UserRepository;

@Component
public class AppInit implements CommandLineRunner {
	
	// JPA Repository
	
	@Autowired
	private UserRepository userRepository;
	
	// Password encoder
	
	@Autowired
	private PasswordEncoder passwordEncoder;

	@Override
	public void run(String... args) {
		
		// Saving first new administrator
		
		Date now = new Date();

		User administrator = new User();
		administrator.setName("Khova Krishna");
		administrator.setSurname("Pilato");
		administrator.setEmail("krishnak.pilato@gmail.com");
		administrator.setCreated(now);
		administrator.setLastModified(now);
		administrator.setPassword(passwordEncoder.encode("12345678"));
		administrator.setUserStatus(UserStatus.CONFIRMED);
		administrator.setApplicationRole(ApplicationRole.ADMINISTRATOR);

		userRepository.save(administrator);
	}
}