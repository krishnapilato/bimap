package com.bimap.platform.web;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/// Operator landing page, served at the root of every service.
/// @author Khova Krishna Pilato
@Controller
@RequiredArgsConstructor
public class LandingController {

    private final PlatformProperties platform;
    private final RuntimeMetricsService metrics;

    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("platform", platform);
        model.addAttribute("snapshot", metrics.snapshot());
        return "home";
    }
}
