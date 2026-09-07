package com.bimap.business.modules.registry.api;

import com.bimap.business.modules.registry.domain.RegistrationStatus;
import com.bimap.business.modules.registry.dto.AssetRegistrationRequest;
import com.bimap.business.modules.registry.dto.AssetRegistrationView;
import com.bimap.business.modules.registry.dto.FormSchema;
import com.bimap.business.modules.registry.dto.RegistrationStatistics;
import com.bimap.business.modules.registry.dto.RegistrationStatusChange;
import com.bimap.business.modules.registry.dto.TableSchema;
import com.bimap.business.modules.registry.export.RegistrationCsvExporter;
import com.bimap.business.modules.registry.repository.RegistrationFilter;
import com.bimap.business.modules.registry.service.AssetRegistrationService;
import com.bimap.business.modules.registry.service.RegistrationSchemaService;
import com.bimap.platform.error.UpstreamServiceException;
import com.bimap.platform.web.PageResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.Instant;

/// @author Khova Krishna Pilato
@RestController
@RequestMapping("/api/v1/registrations")
@RequiredArgsConstructor
public class RegistryController implements RegistryApi {

    private final AssetRegistrationService registrations;
    private final RegistrationSchemaService schemas;
    private final RegistrationCsvExporter csvExporter;

    @Override
    @GetMapping("/schema/form")
    public FormSchema formSchema() {
        return schemas.formSchema();
    }

    @Override
    @GetMapping("/schema/table")
    public TableSchema tableSchema() {
        return schemas.tableSchema();
    }

    @Override
    @GetMapping
    @PreAuthorize("hasAuthority('registration:read')")
    public PageResponse<AssetRegistrationView> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String provinceCode,
            @RequestParam(required = false) String istatCode,
            @RequestParam(required = false) RegistrationStatus status,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @PageableDefault(size = 25, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        var filter = new RegistrationFilter(q, region, provinceCode, istatCode, status, null, from, to);
        return registrations.search(filter, pageable);
    }

    @Override
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('registration:read')")
    public AssetRegistrationView findOne(@PathVariable String id) {
        return registrations.findOne(id);
    }

    @Override
    @PostMapping
    @PreAuthorize("hasAuthority('registration:write')")
    public ResponseEntity<AssetRegistrationView> create(@Valid @RequestBody AssetRegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(registrations.create(request));
    }

    @Override
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('registration:write')")
    public AssetRegistrationView update(@PathVariable String id,
                                        @Valid @RequestBody AssetRegistrationRequest request) {
        return registrations.update(id, request);
    }

    @Override
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('registration:write')")
    public AssetRegistrationView changeStatus(@PathVariable String id,
                                              @Valid @RequestBody RegistrationStatusChange change) {
        return registrations.changeStatus(id, change);
    }

    @Override
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('registration:write')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        registrations.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    @GetMapping("/statistics")
    @PreAuthorize("hasAuthority('registration:read-all')")
    public RegistrationStatistics statistics() {
        return registrations.statistics();
    }

    /// No `produces` on the mapping on purpose. Restricting it to `text/csv` makes Spring reject
    /// this handler whenever a client sends a different `Accept`, and `/{id}` then swallows the
    /// request as a lookup for a registration called "export" — turning a permission failure into
    /// a confusing 404. The content type is set on the response instead.
    @Override
    @GetMapping("/export")
    @PreAuthorize("hasAuthority('registration:export')")
    public void exportCsv(@RequestParam(required = false) String q,
                          @RequestParam(required = false) String region,
                          @RequestParam(required = false) String provinceCode,
                          @RequestParam(required = false) RegistrationStatus status,
                          HttpServletResponse response) {

        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"%s\"".formatted(RegistrationCsvExporter.suggestedFilename()));

        var filter = new RegistrationFilter(q, region, provinceCode, null, status, null, null, null);
        try {
            csvExporter.writeTo(response.getOutputStream(), filter);
        } catch (IOException failure) {
            throw new UpstreamServiceException("csv-export", "the export could not be written", failure);
        }
    }
}
