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
	
	//JPA Repository
	
	@Autowired
	private UserRepository userRepository;
	
	// Password encoder
	
	@Autowired
	private PasswordEncoder passwordEncoder;

	@Override
	public void run(String... args) {
		
		// Saving first new administrator
		
		/*Date now = new Date();

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
		
		User administrator1 = new User();
		administrator1.setName("Stefano");
		administrator1.setSurname("Pilato");
		administrator1.setEmail("stefano.pilato@gmail.com");
		administrator1.setCreated(now);
		administrator1.setLastModified(now);
		administrator1.setPassword(passwordEncoder.encode("12345678"));
		administrator1.setUserStatus(UserStatus.CONFIRMED);
		administrator1.setApplicationRole(ApplicationRole.ADMINISTRATOR);

		userRepository.save(administrator1);
		
		User administrator2 = new User();
		administrator2.setName("Monica");
		administrator2.setSurname("Pozzi");
		administrator2.setEmail("monica.pozzi@gmail.com");
		administrator2.setCreated(now);
		administrator2.setLastModified(now);
		administrator2.setPassword(passwordEncoder.encode("12345678"));
		administrator2.setUserStatus(UserStatus.CONFIRMED);
		administrator2.setApplicationRole(ApplicationRole.ADMINISTRATOR);

		userRepository.save(administrator2);
		
		User administrator3 = new User();
		administrator3.setName("Paolo");
		administrator3.setSurname("Gatto");
		administrator3.setEmail("paolo@gatto@gmail.com");
		administrator3.setCreated(now);
		administrator3.setLastModified(now);
		administrator3.setPassword(passwordEncoder.encode("12345678"));
		administrator3.setUserStatus(UserStatus.CONFIRMED);
		administrator3.setApplicationRole(ApplicationRole.ADMINISTRATOR);

		userRepository.save(administrator3);
		
		User administrator4 = new User();
		administrator4.setName("Sara");
		administrator4.setSurname("Testa");
		administrator4.setEmail("sara.testa@gmail.com");
		administrator4.setCreated(now);
		administrator4.setLastModified(now);
		administrator4.setPassword(passwordEncoder.encode("12345678"));
		administrator4.setUserStatus(UserStatus.CONFIRMED);
		administrator4.setApplicationRole(ApplicationRole.ADMINISTRATOR);

		userRepository.save(administrator4);*/
	}
}