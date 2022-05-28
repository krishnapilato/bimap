package com.example.controller;

import java.io.IOException;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.example.beans.FormModel;
import com.example.core.Utility;
import com.example.repository.FormModelRepository;
import com.example.repository.ListaComuniRepository;

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
	
	// Instancing Utility object
	
	private final Utility utility = new Utility();
	
	// GET to retrieve regions
	
	@GetMapping("/searchRegion={keyword}")
	public List<String> searchRegion(@PathVariable(required = true) String keyword) {
		logger.info("Getting regions containing this word " + keyword);
		return listaComuniRepository.searchRegion(keyword);
	}
	
	@GetMapping("/searchProvince={keyword}")
	public List<String> searchProvince(@PathVariable(required = true) String keyword) {
		logger.info("Getting provinces containing this word " + keyword);
		return listaComuniRepository.searchProvince(keyword);
	}
	
	@GetMapping("/searchMunicipality={keyword}")
	public List<String> searchMunicipality(@PathVariable(required = true) String keyword) {
		logger.info("Getting municipalities containing this word " + keyword);
		return listaComuniRepository.searchMunicipality(keyword);
	}
	
    @PostMapping("/save")
    public void save(@RequestBody(required = true) FormModel formdata) throws IOException {
    	logger.info("Saving " + formdata + " to table and CSV file");
    	formModelRepository.save(formdata);
    	utility.writeCSVFile(formdata);
    }
}