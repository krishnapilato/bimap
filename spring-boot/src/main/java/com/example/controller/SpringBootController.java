package com.example.controller;

import java.io.IOException;
import java.util.Date;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.example.beans.FormModel;
import com.example.beans.Tables;
import com.example.beans.User;
import com.example.core.Utility;
import com.example.enums.ApplicationRole;
import com.example.enums.UserStatus;
import com.example.repository.FormModelRepository;
import com.example.repository.ListaComuniRepository;
import com.example.repository.TablesRepository;
import com.example.repository.UserRepository;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.AddressException;
import lombok.AllArgsConstructor;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@AllArgsConstructor
public class SpringBootController {

	// Log4j logger

	private static final Logger logger = LoggerFactory.getLogger(SpringBootController.class);

	// JPA Repositories

	@Autowired
	private final ListaComuniRepository listaComuniRepository;

	@Autowired
	private final FormModelRepository formModelRepository;

	@Autowired
	private final UserRepository userRepository;

	@Autowired
	private final TablesRepository tablesRepository;

	// Password encoder

	@Autowired
	PasswordEncoder passwordEncoder;

	// Instancing Utility object

	private final Utility utility = new Utility();

	// GET to retrieve regions

	@GetMapping("/searchRegion={keyword}")
	public List<String> searchRegion(@PathVariable(required = true) String keyword) {
		logger.info("Getting regions containing this word " + keyword);
		return listaComuniRepository.searchRegion(keyword);
	}

	// GET Mapping to retrieve provinces

	@GetMapping("/searchProvince={keyword}")
	public List<String> searchProvince(@PathVariable(required = true) String keyword) {
		logger.info("Getting provinces containing this word " + keyword);
		return listaComuniRepository.searchProvince(keyword);
	}

	// GET Mapping to retrieve municipalities

	@GetMapping("/searchMunicipality={keyword}")
	public List<String> searchMunicipality(@PathVariable(required = true) String keyword) {
		logger.info("Getting municipalities containing this word " + keyword);
		return listaComuniRepository.searchMunicipality(keyword);
	}

	// POST Mapping to save FormModel Object

	@PostMapping("/save")
	public void save(@RequestBody(required = true) FormModel formdata) throws IOException {
		logger.info("Saving " + formdata + " to table and CSV file");
		formModelRepository.save(formdata);
		utility.writeCSVFile(formdata);
	}

	@GetMapping("/findAll")
	public List<Tables> findAll() {
		logger.info("Finding all data in tables table");
		return tablesRepository.findAll();
	}

	@GetMapping("/users")
	public List<User> findUsers() {
		logger.info("Finding all data in users table");
		return userRepository.findAll();
	}

	// POST Mapping to save new user

	@PostMapping("/users")
	public User create(@RequestBody(required = true) User newUser) {
		logger.info("Creating new user");
		if (logger.isDebugEnabled()) {
			logger.debug("New user details: " + newUser);
		}

		Date now = new Date();

		newUser.setApplicationRole(ApplicationRole.USER);

		// user email verification

		newUser.setUserStatus(UserStatus.CONFIRMED);
		newUser.setCreated(now);
		newUser.setLastModified(now);
		newUser.setPassword(passwordEncoder.encode(newUser.getPassword()));

		return this.userRepository.save(newUser);
	}

	@PutMapping("/users/{id}")
	public User update(@RequestBody(required = true) User updatedUser, @PathVariable(required = true) Long id) {
		logger.info("Updating user with id: ." + id);
		if (logger.isDebugEnabled()) {
			logger.debug("Updated user details: " + updatedUser);
		}
		return userRepository.findById(id).map(user -> {
			user.setLastModified(new Date());
			user.setName(updatedUser.getName());
			user.setSurname(updatedUser.getSurname());
			user.setEmail(updatedUser.getEmail());
			user.setPassword(passwordEncoder.encode(updatedUser.getPassword()));
			user.setApplicationRole(updatedUser.getApplicationRole());
			return userRepository.save(user);
		}).orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));
	}

	@DeleteMapping("/users/{id}")
	public void delete(@PathVariable(required = true) Long id) {
		logger.info("Deleting user with id: {}." + id);
		userRepository.deleteById(id);
	}

	@GetMapping("/users/sendEmail={email}")
	public String sendEmail(@PathVariable(required = true) String email) {
		logger.info("Trying to send email to: " + email);
		
		User user = this.userRepository.findByEmailAddress(email)
				.orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + email));

		String content = "<div style='text-align: center;font-family: sans-serif;'><h1>Hi " + user.getName()
				+ " !</h1><p>Here are your credentials for accessing the application:</p>" + "Email: " + user.getEmail()
				+ "<br>Password: 12345678" + "<br>Your application role is " + user.getApplicationRole().toString().toLowerCase()
				+ "<br><br>" + "Click <a href='http://localhost:4200/login'>here</a> to login<br><br>"
				+ "Best regards, <br> This email was sent to you by TransferWise, trading as Wise. By using our services, you agree to our customer agreements.\r\n"
				+ "\r\n"
				+ "© TransferWise, trading as Wise 2022. All rights reserved.</div>";
		
		try {
			utility.sendEmail(email, content);
			logger.info("Email sent successfully to: " + email);
			return "Email sent to: " + email;
		} catch (MessagingException | IOException exception) {
			logger.info("Problem to send email to: " + email);
			return "Problem to send email because " + exception.getMessage().toLowerCase();
		}
	}
}