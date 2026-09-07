package com.bimap.platform.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/// Feeds the live counters on the landing page.
/// @author Khova Krishna Pilato
@Tag(name = "Platform", description = "Service health and runtime metrics")
@RestController
@RequestMapping("/api/platform")
@RequiredArgsConstructor
public class PlatformStatusController {

    private final RuntimeMetricsService metrics;

    @Operation(summary = "Current runtime snapshot",
            description = "Health, uptime, memory, CPU, threads, HTTP traffic and connection pool, read from Actuator.")
    @GetMapping("/runtime")
    public RuntimeSnapshot runtime() {
        return metrics.snapshot();
    }
}
