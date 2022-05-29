package com.example.core;

import java.util.Date;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.example.beans.User;
import com.example.beans.UserStatus;
import com.example.repository.UserRepository;

@Component
public class AppInit implements CommandLineRunner {
	@Autowired
	private UserRepository userRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;

	@Override
	public void run(String... args) throws Exception {
		Date now = new Date();

		User admin = new User();
		admin.setName("Khova Krishna");
		admin.setSurname("Pilato");
		admin.setEmail("krishnak.pilato@gmail.com");
		admin.setCreated(now);
		admin.setLastModified(now);
		admin.setPassword(passwordEncoder.encode("12345678"));
		admin.setUserStatus(UserStatus.CONFIRMED);
		admin.setApplicationRole(ApplicationRole.ADMINISTRATOR);

		//userRepository.save(admin);
	}
}