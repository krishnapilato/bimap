package com.bimap.business.modules.geo.service;

import com.bimap.business.modules.geo.client.AddressQuery;
import com.bimap.business.modules.geo.client.NominatimClient;
import com.bimap.business.modules.geo.client.NominatimPlace;
import com.bimap.business.modules.geo.dto.AddressView;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/// Turns a street, narrowed by whatever the form already knows, into a postcode and a coordinate.
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
public class AddressLookupService {

    private final NominatimClient nominatim;
    private final GeoCatalogService catalog;

    public List<AddressView> search(AddressQuery query) {
        return nominatim.search(query).stream().map(AddressLookupService::toView).toList();
    }

    /// Candidate postcodes for the step after the address.
    ///
    /// Most Italian municipalities have exactly one CAP, and Comuni-ITA already knows it; larger
    /// cities have many, and only the resolved street can say which. Both sources are merged, the
    /// street-derived ones first, so the field can be filled in without a second decision in the
    /// common case and still offers the alternatives when there are any.
    public List<String> postalCodes(String municipality, String province, String street, int limit) {
        Set<String> codes = new LinkedHashSet<>();

        if (street != null && !street.isBlank()) {
            nominatim.search(AddressQuery.of(street, municipality, province, null, limit)).stream()
                    .map(place -> place.address() == null ? null : place.address().postcode())
                    .filter(code -> code != null && !code.isBlank())
                    .forEach(codes::add);
        }

        fromCatalog(municipality, province).ifPresent(codes::add);
        return codes.stream().limit(limit).toList();
    }

    private Optional<String> fromCatalog(String municipality, String province) {
        if (municipality == null || municipality.isBlank()) {
            return Optional.empty();
        }
        return catalog.searchMunicipalities(municipality, null, province, 1).stream()
                .map(match -> match.postalCode())
                .filter(code -> code != null && !code.isBlank())
                .findFirst();
    }

    private static AddressView toView(NominatimPlace place) {
        var address = place.address();

        return new AddressView(
                place.displayName(),
                address == null ? null : address.road(),
                address == null ? null : address.houseNumber(),
                address == null ? null : address.postcode(),
                address == null ? null : address.settlement(),
                address == null ? null : address.county(),
                address == null ? null : address.state(),
                place.latitude(),
                place.longitude());
    }

    /// Most relevant first, which for Nominatim means highest importance.
    static Comparator<NominatimPlace> byRelevance() {
        return Comparator.comparingDouble((NominatimPlace place) ->
                place.importance() == null ? 0d : place.importance()).reversed();
    }
}
