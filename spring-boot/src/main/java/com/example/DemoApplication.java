package com.example;

/**
	@author Khova Krishna Pilato

	@name SME - Simple Map Exercise
	Copyright (C) 2022  @khovakrishna-pilato (Github)
*/

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import com.example.core.Utility;

@SpringBootApplication
public class DemoApplication {
	
	private static final Utility utility = new Utility();

	public static void main(String[] args) throws Exception {
		// Creating Directory and Files
		
		utility.createFiles();

		// Start web application

		SpringApplication.run(DemoApplication.class, args);
		//utility.start();
	}
}