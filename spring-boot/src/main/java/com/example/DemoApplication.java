package com.example;

/**
	Written by Khova Krishna Pilato, published under WTFPL: do what you want with it
*/

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import com.example.core.Utility;

@SpringBootApplication
public class DemoApplication {
	
	private static final Utility utility = new Utility();

	public static void main(String[] args) throws Exception {		
		utility.createFiles();
		SpringApplication.run(DemoApplication.class, args);
	}
}