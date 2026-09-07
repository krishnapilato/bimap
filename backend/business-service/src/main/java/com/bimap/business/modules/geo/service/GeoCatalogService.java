package com.bimap.business.modules.geo.service;

import com.bimap.business.modules.geo.catalog.SearchRanking;
import com.bimap.business.modules.geo.client.ComuneResource;
import com.bimap.business.modules.geo.client.ComuniItaClient;
import com.bimap.business.modules.geo.client.ProvinciaResource;
import com.bimap.business.modules.geo.dto.MunicipalityView;
import com.bimap.business.modules.geo.dto.ProvinceView;
import com.bimap.business.modules.geo.dto.RegionView;
import com.bimap.platform.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.OptionalInt;

/// Autocomplete over Italian regions, provinces and municipalities.
///
/// Comuni-ITA is the source of truth and offers no filtering of its own, so the narrowing and
/// the row limit are applied here.
///
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
public class GeoCatalogService {

    public static final int DEFAULT_LIMIT = 5;

    private final ComuniItaClient comuniIta;

    public List<RegionView> searchRegions(String query, int limit) {
        var folded = SearchRanking.fold(query);

        return comuniIta.regions().stream()
                .map(name -> Map.entry(name, SearchRanking.rank(name, folded)))
                .filter(entry -> entry.getValue().isPresent())
                .gather(SearchRanking.best(byRankThenName(Map.Entry::getKey, Map.Entry::getValue), limit))
                .map(entry -> new RegionView(entry.getKey()))
                .toList();
    }

    public List<ProvinceView> searchProvinces(String query, String region, int limit) {
        var folded = SearchRanking.fold(query);

        return comuniIta.provinces().stream()
                .filter(province -> matchesRegion(province.regione(), region))
                .map(province -> Map.entry(province, bestRank(folded, province.nome(), province.sigla())))
                .filter(entry -> entry.getValue().isPresent())
                .gather(SearchRanking.best(byRankThenName(entry -> entry.getKey().nome(), Map.Entry::getValue), limit))
                .map(entry -> toView(entry.getKey()))
                .toList();
    }

    /// The ISTAT-code autocomplete. Naming a region first turns a nationwide read into a
    /// regional one upstream, which is a far smaller document.
    public List<MunicipalityView> searchMunicipalities(String query, String region, String province, int limit) {
        var folded = SearchRanking.fold(query);
        var source = region == null || region.isBlank()
                ? comuniIta.municipalities()
                : comuniIta.municipalitiesOf(region);

        return source.stream()
                .filter(comune -> matchesProvince(comune, province))
                .map(comune -> Map.entry(comune, bestRank(folded, comune.nome(), comune.codice(), comune.codiceCatastale())))
                .filter(entry -> entry.getValue().isPresent())
                .gather(SearchRanking.best(byRankThenName(entry -> entry.getKey().nome(), Map.Entry::getValue), limit))
                .map(entry -> toView(entry.getKey()))
                .toList();
    }

    /// Exact lookup by ISTAT code, for resolving a stored registration back to its municipality.
    public MunicipalityView byIstatCode(String istatCode) {
        return comuniIta.municipalities().stream()
                .filter(comune -> istatCode.equals(comune.codice()))
                .findFirst()
                .map(GeoCatalogService::toView)
                .orElseThrow(() -> new ResourceNotFoundException("Municipality with ISTAT code", istatCode));
    }

    private static boolean matchesRegion(String candidate, String region) {
        return region == null || region.isBlank() || SearchRanking.fold(candidate).equals(SearchRanking.fold(region));
    }

    private static boolean matchesProvince(ComuneResource comune, String province) {
        if (province == null || province.isBlank()) {
            return true;
        }
        var wanted = SearchRanking.fold(province);
        return SearchRanking.fold(comune.provincia().sigla()).equals(wanted)
                || SearchRanking.fold(comune.provincia().nome()).equals(wanted);
    }

    /// The best rank across several searchable fields, so a municipality is found by name,
    /// by ISTAT code or by cadastral code with one query parameter.
    private static OptionalInt bestRank(String foldedQuery, String... candidates) {
        var best = OptionalInt.empty();
        for (var candidate : candidates) {
            var rank = SearchRanking.rank(candidate, foldedQuery);
            if (rank.isPresent() && (best.isEmpty() || rank.getAsInt() < best.getAsInt())) {
                best = rank;
            }
        }
        return best;
    }

    private static <T> Comparator<T> byRankThenName(
            java.util.function.Function<T, String> name,
            java.util.function.Function<T, OptionalInt> rank) {
        return Comparator.<T>comparingInt(element -> rank.apply(element).orElse(Integer.MAX_VALUE))
                .thenComparing(name, String.CASE_INSENSITIVE_ORDER);
    }

    private static ProvinceView toView(ProvinciaResource province) {
        return new ProvinceView(province.codice(), province.nome(), province.sigla(), province.regione());
    }

    private static MunicipalityView toView(ComuneResource comune) {
        var province = comune.provincia();
        var coordinate = comune.coordinate();

        return new MunicipalityView(
                comune.codice(),
                comune.nome(),
                comune.codiceCatastale(),
                comune.cap(),
                province == null ? null : province.nome(),
                province == null ? null : province.sigla(),
                province == null ? null : province.regione(),
                comune.popolazione(),
                coordinate == null ? null : coordinate.lat(),
                coordinate == null ? null : coordinate.lng());
    }
}
