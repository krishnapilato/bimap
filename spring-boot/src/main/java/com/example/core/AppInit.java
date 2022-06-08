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
		
		Date now = new Date();

		/*User administrator = new User();
		administrator.setName("Khova Krishna");
		administrator.setSurname("Pilato");
		administrator.setEmail("krishnak.pilato@gmail.com");
		administrator.setCreated(now);
		administrator.setLastModified(now);
		administrator.setPassword(passwordEncoder.encode("12345678"));
		administrator.setUserStatus(UserStatus.CONFIRMED);
		administrator.setApplicationRole(ApplicationRole.ADMINISTRATOR);
		administrator.setKey("CIAOO");
		userRepository.save(administrator);
		
		// Saving other 4 users for testing
		User user2 = new User();
		user2.setName("Test2");
		user2.setSurname("Test2");
		user2.setEmail("test.test2@gmail.com");
		user2.setCreated(now);
		user2.setLastModified(now);
		user2.setPassword(passwordEncoder.encode("12345678"));
		user2.setUserStatus(UserStatus.CONFIRMED);
		user2.setApplicationRole(ApplicationRole.ADMINISTRATOR);
		user2.setKey("JRU8sE4u3755xBsw");
		userRepository.save(user2);
		
		User user3 = new User();
		user3.setName("Test3");
		user3.setSurname("Test");
		user3.setEmail("test.test3@gmail.com");
		user3.setCreated(now);
		user3.setLastModified(now);
		user3.setPassword(passwordEncoder.encode("12345678"));
		user3.setUserStatus(UserStatus.NOT_CONFIRMED);
		user3.setApplicationRole(ApplicationRole.USER);
		user3.setKey("J4evnj6ZKqLHJPFA");
		userRepository.save(user3);
		
		User user4 = new User();
		user4.setName("Test4");
		user4.setSurname("Test");
		user4.setEmail("test.test4@gmail.com");
		user4.setCreated(now);
		user4.setLastModified(now);
		user4.setPassword(passwordEncoder.encode("12345678"));
		user4.setUserStatus(UserStatus.CONFIRMED);
		user4.setApplicationRole(ApplicationRole.USER);
		user4.setKey("FNFr6JbgPhMbxa2U");
		userRepository.save(user4);
		
		User user5 = new User();
		user5.setName("Test5");
		user5.setSurname("Test");
		user5.setEmail("test.test5@gmail.com");
		user5.setCreated(now);
		user5.setLastModified(now);
		user5.setPassword(passwordEncoder.encode("12345678"));
		user5.setUserStatus(UserStatus.NOT_CONFIRMED);
		user5.setApplicationRole(ApplicationRole.MANAGER);
		user5.setKey("TSPyv7HL7RGwHnMf");
		userRepository.save(user5);*/
	}
}