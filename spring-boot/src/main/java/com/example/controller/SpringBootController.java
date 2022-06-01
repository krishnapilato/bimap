package com.example.controller;

import java.io.IOException;
import java.util.Date;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
    
    // POST Mapping to save new user
	
	@PostMapping("/users")
	public User create(@RequestBody User newUser) {
		logger.info("Creating new user.");
		if (logger.isDebugEnabled()) {
			logger.debug("New user details: {}", newUser);
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
}