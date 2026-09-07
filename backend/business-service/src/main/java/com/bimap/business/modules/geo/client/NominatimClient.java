package com.bimap.business.modules.geo.client;

import com.bimap.platform.error.UpstreamServiceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriBuilder;

import java.util.List;

/// Resolves a street into a postcode and a point, through OpenStreetMap.
///
/// Nominatim asks for at most one call per second and an identifiable user agent. The cache is
/// what keeps us inside that: the same address typed twice costs one call, not two.
///
/// @author Khova Krishna Pilato
@Slf4j
@Component
public class NominatimClient {

    public static final String CACHE_ADDRESSES = "geo-addresses";

    private static final String UPSTREAM = "nominatim";
    private static final ParameterizedTypeReference<List<NominatimPlace>> PLACES =
            new ParameterizedTypeReference<>() {
            };

    private final RestClient client;

    public NominatimClient(RestClient nominatimRestClient) {
        this.client = nominatimRestClient;
    }

    @Cacheable(cacheNames = CACHE_ADDRESSES, key = "#query.key()")
    public List<NominatimPlace> search(AddressQuery query) {
        try {
            var body = client.get()
                    .uri(uri -> build(uri, query))
                    .retrieve()
                    .body(PLACES);

            log.debug("Nominatim returned {} matches for {}", body == null ? 0 : body.size(), query.key());
            return body == null ? List.of() : body;
        } catch (RuntimeException failure) {
            throw new UpstreamServiceException(UPSTREAM, "address lookup failed", failure);
        }
    }

    /// Free text goes to `q`; anything narrowed goes to the structured parameters, which is the
    /// only form Nominatim will combine with a county or a postcode.
    private static java.net.URI build(UriBuilder uri, AddressQuery query) {
        uri.path("/search")
                .queryParam("format", "json")
                .queryParam("addressdetails", 1)
                .queryParam("countrycodes", "it")
                .queryParam("limit", query.limit());

        if (query.isFreeText()) {
            return uri.queryParam("q", query.freeText()).build();
        }

        appendIfPresent(uri, "street", query.street());
        appendIfPresent(uri, "city", query.municipality());
        appendIfPresent(uri, "county", query.province());
        appendIfPresent(uri, "state", query.region());
        appendIfPresent(uri, "postalcode", query.postalCode());
        return uri.build();
    }

    private static void appendIfPresent(UriBuilder uri, String name, String value) {
        if (value != null && !value.isBlank()) {
            uri.queryParam(name, value.strip());
        }
    }
}
