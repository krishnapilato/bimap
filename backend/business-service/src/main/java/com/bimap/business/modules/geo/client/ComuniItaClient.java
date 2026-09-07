package com.bimap.business.modules.geo.client;

import com.bimap.platform.error.UpstreamServiceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Locale;

/// Reads Italian administrative geography from Comuni-ITA.
///
/// The upstream has no search or paging: `/comuni` is one document of every municipality in the
/// country. Answers are therefore cached, so a keystroke in an autocomplete never becomes a
/// network call, while the data still refreshes itself on the configured interval instead of
/// going stale in a committed file. `/comuni/{region}` is used whenever a region is already
/// known, because it returns a far smaller slice.
///
/// @author Khova Krishna Pilato
@Slf4j
@Component
public class ComuniItaClient {

    public static final String CACHE_REGIONS = "geo-regions";
    public static final String CACHE_PROVINCES = "geo-provinces";
    public static final String CACHE_MUNICIPALITIES = "geo-municipalities";

    private static final String UPSTREAM = "comuni-ita";
    private static final ParameterizedTypeReference<List<ComuneResource>> COMUNI =
            new ParameterizedTypeReference<>() {
            };
    private static final ParameterizedTypeReference<List<ProvinciaResource>> PROVINCE =
            new ParameterizedTypeReference<>() {
            };
    private static final ParameterizedTypeReference<List<String>> NAMES =
            new ParameterizedTypeReference<>() {
            };

    private final RestClient client;

    public ComuniItaClient(RestClient comuniItaRestClient) {
        this.client = comuniItaRestClient;
    }

    @Cacheable(CACHE_REGIONS)
    public List<String> regions() {
        return get("/regioni", NAMES);
    }

    @Cacheable(CACHE_PROVINCES)
    public List<ProvinciaResource> provinces() {
        return get("/province", PROVINCE);
    }

    /// Every municipality in Italy. Expensive upstream, which is exactly why it is cached.
    @Cacheable(CACHE_MUNICIPALITIES)
    public List<ComuneResource> municipalities() {
        return get("/comuni", COMUNI);
    }

    /// The municipalities of one region, keyed by the lower-case region name.
    @Cacheable(cacheNames = CACHE_MUNICIPALITIES, key = "#region.toLowerCase()")
    public List<ComuneResource> municipalitiesOf(String region) {
        return get("/comuni/" + region.toLowerCase(Locale.ROOT).replace(" ", "-"), COMUNI);
    }

    private <T> List<T> get(String path, ParameterizedTypeReference<List<T>> type) {
        try {
            var body = client.get().uri(path).retrieve().body(type);
            log.debug("Comuni-ITA {} returned {} rows", path, body == null ? 0 : body.size());
            return body == null ? List.of() : body;
        } catch (RuntimeException failure) {
            throw new UpstreamServiceException(UPSTREAM, "could not read " + path, failure);
        }
    }
}
