package com.bimap.platform.web;

import java.time.Instant;
import java.util.List;

/// A point-in-time reading of the service, assembled from Actuator health and Micrometer meters.
/// @author Khova Krishna Pilato
public record RuntimeSnapshot(
        String service,
        String version,
        String status,
        List<Component> components,
        List<String> profiles,
        Runtime runtime,
        Uptime uptime,
        Memory heap,
        Memory nonHeap,
        Cpu cpu,
        Threads threads,
        Http http,
        ConnectionPool database,
        Instant startedAt,
        Instant sampledAt) {

    public record Component(String name, String status) {
    }

    public record Runtime(String java, String jvm, String os, String architecture, int port) {
    }

    public record Uptime(long seconds, String display) {
    }

    public record Memory(long used, long committed, long max, double usedRatio,
                         String display, String usedDisplay, String maxDisplay) {
    }

    public record Cpu(double process, double system, int cores) {
    }

    public record Threads(int live, int daemon, int peak) {
    }

    public record Http(long requests, double averageMillis, double slowestMillis, long clientErrors, long serverErrors) {
    }

    public record ConnectionPool(int active, int idle, int max, int pending) {
    }

    public boolean healthy() {
        return "UP".equals(status);
    }
}
