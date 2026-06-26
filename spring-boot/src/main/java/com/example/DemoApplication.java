package com.example;

/**
 * Code written by Khova Krishna Pilato, published under WTFPL: do what you want with it
 */

import com.example.core.Utility;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {

    private static final Utility utility = new Utility();

    public static void main(String[] args) throws Exception {
        utility.createFiles();
        SpringApplication.run(DemoApplication.class, args);
    }
}