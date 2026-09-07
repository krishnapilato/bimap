package com.bimap.platform.web;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.boot.info.BuildProperties;
import org.springframework.core.env.Environment;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/// Reads the live Actuator health indicators and Micrometer meters behind the landing page.
/// @author Khova Krishna Pilato
@RequiredArgsConstructor
public class RuntimeMetricsService {

    private static final String[] BYTE_UNITS = {"B", "KB", "MB", "GB", "TB"};

    private final MeterRegistry meters;
    private final Environment environment;
    private final PlatformProperties platform;
    private final Map<String, HealthIndicator> healthIndicators;
    private final BuildProperties buildProperties;

    public RuntimeSnapshot snapshot() {
        var components = healthIndicators.entrySet().stream()
                .map(entry -> new RuntimeSnapshot.Component(shortName(entry.getKey()), statusOf(entry.getValue())))
                .sorted(Comparator.comparing(RuntimeSnapshot.Component::name))
                .toList();

        var status = components.stream().anyMatch(component -> !"UP".equals(component.status())) ? "DOWN" : "UP";

        return new RuntimeSnapshot(
                platform.serviceName(),
                Optional.ofNullable(buildProperties).map(BuildProperties::getVersion).orElse("dev"),
                status,
                components,
                List.of(environment.getActiveProfiles()),
                runtime(),
                uptime(),
                memory("heap"),
                memory("nonheap"),
                cpu(),
                threads(),
                http(),
                connectionPool(),
                startedAt(),
                Instant.now());
    }

    private RuntimeSnapshot.Runtime runtime() {
        return new RuntimeSnapshot.Runtime(
                System.getProperty("java.version"),
                "%s %s".formatted(System.getProperty("java.vm.name"), System.getProperty("java.vm.version")),
                "%s %s".formatted(System.getProperty("os.name"), System.getProperty("os.version")),
                System.getProperty("os.arch"),
                environment.getProperty("local.server.port", Integer.class,
                        environment.getProperty("server.port", Integer.class, 8080)));
    }

    private RuntimeSnapshot.Uptime uptime() {
        var seconds = (long) gauge("process.uptime");
        return new RuntimeSnapshot.Uptime(seconds, humanDuration(Duration.ofSeconds(seconds)));
    }

    private RuntimeSnapshot.Memory memory(String area) {
        var used = (long) gauge("jvm.memory.used", "area", area);
        var committed = (long) gauge("jvm.memory.committed", "area", area);
        var max = (long) gauge("jvm.memory.max", "area", area);
        var ratio = max > 0 ? (double) used / max : 0d;
        var display = max > 0
                ? "%s / %s".formatted(humanBytes(used), humanBytes(max))
                : humanBytes(used);
        return new RuntimeSnapshot.Memory(used, committed, max, round(ratio, 4), display,
                humanBytes(used), max > 0 ? humanBytes(max) : "unbounded");
    }

    private RuntimeSnapshot.Cpu cpu() {
        return new RuntimeSnapshot.Cpu(
                round(gauge("process.cpu.usage"), 4),
                round(gauge("system.cpu.usage"), 4),
                java.lang.Runtime.getRuntime().availableProcessors());
    }

    private RuntimeSnapshot.Threads threads() {
        return new RuntimeSnapshot.Threads(
                (int) gauge("jvm.threads.live"),
                (int) gauge("jvm.threads.daemon"),
                (int) gauge("jvm.threads.peak"));
    }

    private RuntimeSnapshot.Http http() {
        var timers = meters.find("http.server.requests").timers();
        var requests = timers.stream().mapToLong(Timer::count).sum();
        var totalMillis = timers.stream().mapToDouble(timer -> timer.totalTime(TimeUnit.MILLISECONDS)).sum();
        var slowest = timers.stream().mapToDouble(timer -> timer.max(TimeUnit.MILLISECONDS)).max().orElse(0d);

        return new RuntimeSnapshot.Http(
                requests,
                requests == 0 ? 0d : round(totalMillis / requests, 2),
                round(slowest, 2),
                countByOutcome("CLIENT_ERROR"),
                countByOutcome("SERVER_ERROR"));
    }

    private RuntimeSnapshot.ConnectionPool connectionPool() {
        return new RuntimeSnapshot.ConnectionPool(
                (int) gauge("hikaricp.connections.active"),
                (int) gauge("hikaricp.connections.idle"),
                (int) gauge("hikaricp.connections.max"),
                (int) gauge("hikaricp.connections.pending"));
    }

    private Instant startedAt() {
        var epochSeconds = gauge("process.start.time");
        return epochSeconds > 0
                ? Instant.ofEpochSecond((long) epochSeconds)
                : Instant.now().minusSeconds((long) gauge("process.uptime"));
    }

    private long countByOutcome(String outcome) {
        return meters.find("http.server.requests").tag("outcome", outcome).timers().stream()
                .mapToLong(Timer::count)
                .sum();
    }

    private double gauge(String name, String... tags) {
        return meters.find(name).tags(tags).gauges().stream()
                .mapToDouble(Gauge::value)
                .filter(value -> !Double.isNaN(value))
                .sum();
    }

    private static String statusOf(HealthIndicator indicator) {
        try {
            return Optional.ofNullable(indicator.health())
                    .map(Health::getStatus)
                    .map(status -> status.getCode())
                    .orElse("UNKNOWN");
        } catch (RuntimeException failure) {
            return "DOWN";
        }
    }

    private static String shortName(String beanName) {
        return beanName.endsWith("HealthIndicator")
                ? beanName.substring(0, beanName.length() - "HealthIndicator".length())
                : beanName;
    }

    static String humanBytes(long bytes) {
        var value = (double) bytes;
        var unit = 0;
        while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
            value /= 1024;
            unit++;
        }
        return value >= 100 || unit == 0
                ? "%.0f %s".formatted(value, BYTE_UNITS[unit])
                : "%.1f %s".formatted(value, BYTE_UNITS[unit]);
    }

    static String humanDuration(Duration duration) {
        var days = duration.toDays();
        var hours = duration.toHoursPart();
        var minutes = duration.toMinutesPart();
        var seconds = duration.toSecondsPart();

        if (days > 0) {
            return "%dd %dh %dm".formatted(days, hours, minutes);
        }
        if (hours > 0) {
            return "%dh %dm".formatted(hours, minutes);
        }
        return minutes > 0 ? "%dm %ds".formatted(minutes, seconds) : "%ds".formatted(seconds);
    }

    private static double round(double value, int decimals) {
        var factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }
}
