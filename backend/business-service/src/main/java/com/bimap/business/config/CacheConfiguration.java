package com.bimap.business.config;

import com.bimap.business.modules.geo.client.CodiceUnivocoClient;
import com.bimap.business.modules.geo.client.ComuniItaClient;
import com.bimap.business.modules.geo.client.NominatimClient;
import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.cache.support.NoOpCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.Duration;
import java.util.List;

/// Caches the answers of the three upstream APIs.
///
/// None of them offers server-side search, so an autocomplete would otherwise pull the same large
/// document on every keystroke. Each cache carries the TTL configured for its upstream; setting
/// that TTL to zero turns caching off and sends every request through, which is the switch to
/// reach for when data freshness matters more than latency.
///
/// @author Khova Krishna Pilato
@Slf4j
@Configuration
@EnableCaching
@RequiredArgsConstructor
public class CacheConfiguration {

    private final IntegrationProperties integration;

    @Bean
    public CacheManager cacheManager() {
        var geography = integration.comuniIta();
        var addresses = integration.nominatim();
        var entities = integration.codiceUnivoco();

        if (geography.cachingDisabled() && addresses.cachingDisabled() && entities.cachingDisabled()) {
            log.warn("Upstream caching is disabled; every lookup will call the source API");
            return new NoOpCacheManager();
        }

        var manager = new CaffeineCacheManager();
        manager.setCacheNames(List.of(
                ComuniItaClient.CACHE_REGIONS,
                ComuniItaClient.CACHE_PROVINCES,
                ComuniItaClient.CACHE_MUNICIPALITIES,
                NominatimClient.CACHE_ADDRESSES,
                CodiceUnivocoClient.CACHE_ENTITY_CODES));

        // The geography documents are few and large; addresses and entity lookups are many and small.
        manager.registerCustomCache(ComuniItaClient.CACHE_REGIONS, build(geography.cacheTtl(), 4));
        manager.registerCustomCache(ComuniItaClient.CACHE_PROVINCES, build(geography.cacheTtl(), 4));
        manager.registerCustomCache(ComuniItaClient.CACHE_MUNICIPALITIES, build(geography.cacheTtl(), 32));
        manager.registerCustomCache(NominatimClient.CACHE_ADDRESSES, build(addresses.cacheTtl(), 5_000));
        manager.registerCustomCache(CodiceUnivocoClient.CACHE_ENTITY_CODES, build(entities.cacheTtl(), 2_000));

        log.info("Upstream caches ready: geography {}, addresses {}, entity codes {}",
                geography.cacheTtl(), addresses.cacheTtl(), entities.cacheTtl());
        return manager;
    }

    private static com.github.benmanes.caffeine.cache.Cache<Object, Object> build(Duration ttl, int maximumSize) {
        return Caffeine.newBuilder()
                .expireAfterWrite(ttl.isZero() || ttl.isNegative() ? Duration.ofSeconds(1) : ttl)
                .maximumSize(maximumSize)
                .recordStats()
                .build();
    }

    /// Loads the country-wide geography shortly after start, and again once each TTL has passed,
    /// so the first surveyor of the day never waits for a three-megabyte download.
    @Bean
    public CacheWarmUp cacheWarmUp(ComuniItaClient client) {
        return new CacheWarmUp(client);
    }

    /// @author Khova Krishna Pilato
    @Slf4j
    @RequiredArgsConstructor
    public static class CacheWarmUp {

        private final ComuniItaClient client;

        @Scheduled(initialDelayString = "PT10S", fixedDelayString = "${bimap.integration.warm-up-interval:PT6H}")
        public void warm() {
            try {
                log.info("Geography cache warm: {} regions, {} provinces, {} municipalities",
                        client.regions().size(), client.provinces().size(), client.municipalities().size());
            } catch (RuntimeException failure) {
                log.warn("Could not warm the geography cache: {}", failure.getMessage());
            }
        }
    }
}
