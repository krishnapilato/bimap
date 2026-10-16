package com.example.controller;

import module java.base;

import com.example.model.FormModel;
import com.example.model.Tables;
import com.example.repository.FormModelRepository;
import com.example.repository.ListaComuniRepository;
import com.example.repository.TablesRepository;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tools.jackson.dataformat.csv.CsvMapper;

@RestController
@RequiredArgsConstructor
public class MapController {

    private static final CsvMapper CSV = new CsvMapper();

    private final ListaComuniRepository places;
    private final TablesRepository assets;
    private final FormModelRepository forms;

    @JsonPropertyOrder({"id", "region", "province", "municipality", "address", "name", "istatCode", "latitude", "longitude"})
    record FormRow(Long id, String region, String province, String municipality, String address, String name, String istatCode, double latitude, double longitude) {
        static FormRow of(FormModel form) {
            return new FormRow(form.getId(), form.getRegion(), form.getProvince(), form.getMunicipality(), form.getAddress(), form.getGoodNaming(), form.getIstatCode(), form.getLatitude(), form.getLongitude());
        }
    }

    @GetMapping("/places/regions")
    List<String> regions(@RequestParam @NotBlank String q) {
        return places.searchRegion(q);
    }

    @GetMapping("/places/provinces")
    List<String> provinces(@RequestParam @NotBlank String q) {
        return places.searchProvince(q);
    }

    @GetMapping("/places/municipalities")
    List<String> municipalities(@RequestParam @NotBlank String q) {
        return places.searchMunicipality(q);
    }

    @GetMapping("/assets")
    List<Tables> assets() {
        return assets.findAll();
    }

    @PostMapping("/forms")
    @ResponseStatus(HttpStatus.CREATED)
    FormModel saveForm(@Valid @RequestBody FormModel form) {
        form.setId(null);
        return forms.save(form);
    }

    @GetMapping(value = "/forms/export.csv", produces = "text/csv")
    ResponseEntity<String> exportForms() {
        var rows = forms.findAll().stream().map(FormRow::of).toList();
        var csv = CSV.writer(CSV.schemaFor(FormRow.class).withHeader()).writeValueAsString(rows);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"forms.csv\"")
                .body(csv);
    }
}
