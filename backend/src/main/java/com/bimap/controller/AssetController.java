package com.bimap.controller;

import module java.base;

import com.bimap.model.AssetForm;
import com.bimap.model.AssetFormRow;
import com.bimap.model.HeritageAsset;
import com.bimap.repository.AssetFormRepository;
import com.bimap.repository.ReferenceDataRepository;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.dataformat.csv.CsvMapper;

@RestController
public class AssetController {

    private static final CsvMapper CSV = new CsvMapper();

    private final ReferenceDataRepository referenceData;
    private final AssetFormRepository forms;

    public AssetController(ReferenceDataRepository referenceData, AssetFormRepository forms) {
        this.referenceData = referenceData;
        this.forms = forms;
    }

    record FormRequest(
        @NotBlank @Size(max = 255) String region,
        @NotBlank @Size(max = 255) String province,
        @NotBlank @Size(max = 255) String municipality,
        @NotBlank @Size(max = 255) String address,
        @NotBlank @Size(max = 255) String goodNaming,
        @NotNull @PositiveOrZero Integer number,
        @NotNull @PositiveOrZero Integer goodID,
        @Pattern(regexp = "\\d{6}", message = "must be 6 digits.") String istatCode,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude
    ) {
        AssetForm toEntity() {
            return new AssetForm(region, province, municipality, address, goodNaming, number, goodID, istatCode, latitude, longitude);
        }
    }

    record SavedForm(Long id, @JsonUnwrapped FormRequest form) { }

    @GetMapping("/places/regions")
    List<String> regions(@RequestParam @NotBlank @Size(max = 100) String q) {
        return referenceData.searchRegions(q);
    }

    @GetMapping("/places/provinces")
    List<String> provinces(@RequestParam @NotBlank @Size(max = 100) String q) {
        return referenceData.searchProvinces(q);
    }

    @GetMapping("/places/municipalities")
    List<String> municipalities(@RequestParam @NotBlank @Size(max = 100) String q) {
        return referenceData.searchMunicipalities(q);
    }

    @GetMapping("/assets")
    List<HeritageAsset> assets() {
        return referenceData.findAssets();
    }

    @PostMapping("/forms")
    @ResponseStatus(HttpStatus.CREATED)
    SavedForm saveForm(@Valid @RequestBody FormRequest form) {
        if (form.goodID() > 0 && !referenceData.assetExists(form.goodID())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The selected heritage asset does not exist. Use goodID 0 for an unlisted asset.");
        }
        return new SavedForm(forms.save(form.toEntity()).getId(), form);
    }

    @GetMapping(value = "/forms/export.csv", produces = "text/csv")
    void exportForms(HttpServletResponse response) throws IOException {
        response.setContentType("text/csv;charset=UTF-8");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"forms.csv\"");
        var through = forms.maximumId();
        var after = 0L;
        try (var csv = CSV.writer(CSV.schemaFor(AssetFormRow.class).withHeader()).writeValues(response.getWriter())) {
            while (after < through) {
                var rows = forms.findRowsAfter(after, through, PageRequest.of(0, 500));
                if (rows.isEmpty()) break;
                for (var row : rows) csv.write(row.forSpreadsheet());
                after = rows.getLast().id();
            }
        }
    }
}
