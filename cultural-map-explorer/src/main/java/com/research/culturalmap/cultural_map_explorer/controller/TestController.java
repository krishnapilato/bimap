package com.research.culturalmap.cultural_map_explorer.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller for testing basic API functionality.
 */
@RestController
public class TestController {

    /**
     * Endpoint to return a basic "Hello World" response.
     *
     * @return A simple "Hello World" message.
     */
    @GetMapping("/api/v1/test")
    public String helloWorld() {
        return "Hello World";
    }
}