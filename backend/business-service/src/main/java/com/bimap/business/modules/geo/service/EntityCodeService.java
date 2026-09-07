package com.bimap.business.modules.geo.service;

import com.bimap.business.modules.geo.catalog.SearchRanking;
import com.bimap.business.modules.geo.client.CodiceUnivocoClient;
import com.bimap.business.modules.geo.client.CodiceUnivocoResponse;
import com.bimap.business.modules.geo.dto.EntityCodeView;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/// Finds the billing code of a public body, narrowed by where the asset actually is.
///
/// The directory searches nationally and matches loosely, so two things have to happen. The
/// place name is folded into the upstream query, because that is the only way its ranking
/// surfaces bodies seated there at all; and the answer is then filtered locally, because the
/// upstream will still return half of Rome alongside them.
///
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
public class EntityCodeService {

    private final CodiceUnivocoClient codiceUnivoco;

    public List<EntityCodeView> search(String query, String municipality, String province, String region, int limit) {
        var upstreamQuery = withPlace(query, municipality, province, region);

        var matches = codiceUnivoco.search(upstreamQuery).stream()
                .filter(entry -> matches(entry, municipality, province, region))
                .limit(limit)
                .map(EntityCodeService::toView)
                .toList();

        log.debug("Entity code lookup {} returned {} rows", upstreamQuery, matches.size());
        return matches;
    }

    /// The directory has no location parameter, so the place goes into the free-text query.
    private static String withPlace(String query, String municipality, String province, String region) {
        var place = firstPresent(municipality, province, region);
        return place == null ? query : query + " " + place;
    }

    private static boolean matches(CodiceUnivocoResponse.Entry entry,
                                   String municipality, String province, String region) {
        var comune = entry.comune();
        if (comune == null) {
            return municipality == null && province == null && region == null;
        }
        return equalsFolded(comune.nome(), municipality)
                && equalsFolded(comune.provincia(), province)
                && equalsFolded(comune.regione(), region);
    }

    /// An absent filter matches everything, which is what keeps the endpoint usable on its own.
    private static boolean equalsFolded(String candidate, String filter) {
        if (filter == null || filter.isBlank()) {
            return true;
        }
        return SearchRanking.fold(candidate).equals(SearchRanking.fold(filter));
    }

    private static String firstPresent(String... candidates) {
        for (var candidate : candidates) {
            if (candidate != null && !candidate.isBlank()) {
                return candidate.strip();
            }
        }
        return null;
    }

    private static EntityCodeView toView(CodiceUnivocoResponse.Entry entry) {
        var comune = entry.comune();

        return new EntityCodeView(
                entry.denominazione(),
                entry.codicePrincipale(),
                entry.codiceIpa(),
                entry.codiceFiscale(),
                entry.categoria(),
                comune == null ? null : comune.nome(),
                comune == null ? null : comune.provincia(),
                comune == null ? null : comune.regione(),
                entry.numeroUffici(),
                entry.url());
    }
}
