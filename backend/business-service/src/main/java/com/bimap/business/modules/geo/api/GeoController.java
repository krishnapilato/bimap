package com.bimap.business.modules.geo.api;

import com.bimap.business.modules.geo.client.AddressQuery;
import com.bimap.business.modules.geo.dto.AddressView;
import com.bimap.business.modules.geo.dto.EntityCodeView;
import com.bimap.business.modules.geo.dto.MunicipalityView;
import com.bimap.business.modules.geo.dto.ProvinceView;
import com.bimap.business.modules.geo.dto.RegionView;
import com.bimap.business.modules.geo.service.AddressLookupService;
import com.bimap.business.modules.geo.service.EntityCodeService;
import com.bimap.business.modules.geo.service.GeoCatalogService;
import com.bimap.platform.error.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/// @author Khova Krishna Pilato
@Validated
@RestController
@RequestMapping("/api/v1/geo")
@RequiredArgsConstructor
public class GeoController implements GeoApi {

    private final GeoCatalogService catalog;
    private final AddressLookupService addressLookup;
    private final EntityCodeService entityCodeService;

    @Override
    @GetMapping("/regions")
    public List<RegionView> regions(@RequestParam(required = false, defaultValue = "") String q,
                                    @RequestParam(required = false, defaultValue = "5") int limit) {
        return catalog.searchRegions(q, limit);
    }

    @Override
    @GetMapping("/provinces")
    public List<ProvinceView> provinces(@RequestParam(required = false, defaultValue = "") String q,
                                        @RequestParam(required = false) String region,
                                        @RequestParam(required = false, defaultValue = "5") int limit) {
        return catalog.searchProvinces(q, region, limit);
    }

    @Override
    @GetMapping("/municipalities")
    public List<MunicipalityView> municipalities(@RequestParam(required = false, defaultValue = "") String q,
                                                 @RequestParam(required = false) String region,
                                                 @RequestParam(required = false) String province,
                                                 @RequestParam(required = false, defaultValue = "5") int limit) {
        return catalog.searchMunicipalities(q, region, province, limit);
    }

    @Override
    @GetMapping("/municipalities/{istatCode}")
    public MunicipalityView municipality(@PathVariable String istatCode) {
        return catalog.byIstatCode(istatCode);
    }

    @Override
    @GetMapping("/addresses")
    public List<AddressView> addresses(@RequestParam(required = false) String street,
                                       @RequestParam(required = false) String municipality,
                                       @RequestParam(required = false) String province,
                                       @RequestParam(required = false) String region,
                                       @RequestParam(required = false) String q,
                                       @RequestParam(required = false, defaultValue = "5") int limit) {
        if (hasText(street)) {
            return addressLookup.search(AddressQuery.of(street, municipality, province, region, limit));
        }
        if (hasText(q)) {
            return addressLookup.search(AddressQuery.freeText(q, limit));
        }
        throw new BusinessRuleException("Supply either a street, or a free-text q.");
    }

    @Override
    @GetMapping("/postal-codes")
    public List<String> postalCodes(@RequestParam String municipality,
                                    @RequestParam(required = false) String province,
                                    @RequestParam(required = false) String street,
                                    @RequestParam(required = false, defaultValue = "5") int limit) {
        return addressLookup.postalCodes(municipality, province, street, limit);
    }

    @Override
    @GetMapping("/entity-codes")
    public List<EntityCodeView> entityCodes(@RequestParam String q,
                                            @RequestParam(required = false) String municipality,
                                            @RequestParam(required = false) String province,
                                            @RequestParam(required = false) String region,
                                            @RequestParam(required = false, defaultValue = "5") int limit) {
        return entityCodeService.search(q, municipality, province, region, limit);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
