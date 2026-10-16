package com.example.controller;

import module java.base;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.health.actuate.endpoint.HealthEndpoint;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@RequiredArgsConstructor
public class LandingPageController {

    private final HealthEndpoint healthEndpoint;

    @Value("${info.app.name}")
    private String name;

    @Value("${info.app.description}")
    private String description;

    @Value("${info.app.version}")
    private String version;

    @GetMapping("/")
    String landingPage(Model model) {
        var started = ProcessHandle.current().info().startInstant().orElse(Instant.now());
        var uptime = Duration.between(started, Instant.now());
        model.addAttribute("name", name);
        model.addAttribute("description", description);
        model.addAttribute("version", version);
        model.addAttribute("status", healthEndpoint.health().getStatus().getCode());
        model.addAttribute("javaVersion", Runtime.version().feature());
        model.addAttribute("springBootVersion", SpringBootVersion.getVersion());
        model.addAttribute("uptime", "%dd %dh %dm".formatted(uptime.toDays(), uptime.toHoursPart(), uptime.toMinutesPart()));
        return "landing-page";
    }
}
