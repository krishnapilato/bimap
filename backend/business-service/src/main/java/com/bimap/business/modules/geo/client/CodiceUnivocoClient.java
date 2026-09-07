package com.bimap.business.modules.geo.client;

import com.bimap.platform.error.UpstreamServiceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

/// Looks up the billing code of an Italian public body.
/// @author Khova Krishna Pilato
@Slf4j
@Component
public class CodiceUnivocoClient {

    public static final String CACHE_ENTITY_CODES = "geo-entity-codes";

    private static final String UPSTREAM = "codiceunivoco";

    private final RestClient client;

    public CodiceUnivocoClient(RestClient codiceUnivocoRestClient) {
        this.client = codiceUnivocoRestClient;
    }

    @Cacheable(CACHE_ENTITY_CODES)
    public List<CodiceUnivocoResponse.Entry> search(String query) {
        try {
            var body = client.get()
                    .uri(uri -> uri.path("/api/v1/search").queryParam("q", query).build())
                    .retrieve()
                    .body(CodiceUnivocoResponse.class);

            log.debug("codiceunivoco matched {} entities for {}",
                    body == null ? 0 : body.risultati().size(), query);
            return body == null ? List.of() : body.risultati();
        } catch (RuntimeException failure) {
            throw new UpstreamServiceException(UPSTREAM, "entity code lookup failed", failure);
        }
    }
}
