package com.example;

/**
	@author Khova Krishna Pilato
*/

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import com.example.core.Utility;

@SpringBootApplication
public class DemoApplication {
	
	private static final Logger logger = LoggerFactory.getLogger(DemoApplication.class);
	
	private static final Utility utility = new Utility();

	public static void main(String[] args) throws Exception {		
		utility.createFiles();
		SpringApplication.run(DemoApplication.class, args);
		logger.info("App started successfully: open http://localhost:8080 to try it!");
	}
}