package com.bimap;

import module java.base;

import com.bimap.model.AssetForm;
import com.bimap.model.AssetFormRow;
import com.bimap.model.User;
import com.bimap.repository.AssetFormRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CsvExportTest extends ApiTest {

    @Autowired
    private AssetFormRepository forms;

    @Test
    void exportsEveryRowAcrossBatchBoundariesWithUtf8AndAllFields() throws Exception {
        var rows = new ArrayList<AssetForm>();
        for (var i = 0; i < 505; i++) {
            rows.add(new AssetForm("Piemonte", "Alessandria", "Cremolino", "via Libertà " + i, "Asset " + i, i, 7168, "006061", 44.6, 8.5));
        }
        forms.saveAllAndFlush(rows);
        var response = mvc.perform(get("/forms/export.csv").header(HttpHeaders.AUTHORIZATION, bearer(tokenFor(User.Role.USER))))
                .andExpect(status().isOk()).andReturn().getResponse();
        var csv = response.getContentAsString(StandardCharsets.UTF_8);
        assertThat(response.getCharacterEncoding()).isEqualToIgnoringCase("UTF-8");
        assertThat(csv.lines().count()).isEqualTo(506);
        assertThat(csv).contains("via Libertà 0").contains("via Libertà 504");
        assertThat(csv.lines().toList().getLast()).endsWith(",504,7168");
    }

    @Test
    void emptyExportStillContainsAHeader() throws Exception {
        var response = mvc.perform(get("/forms/export.csv").header(HttpHeaders.AUTHORIZATION, bearer(tokenFor(User.Role.USER))))
                .andExpect(status().isOk()).andReturn().getResponse();
        assertThat(response.getContentAsString().strip()).isEqualTo("id,region,province,municipality,address,name,istatCode,latitude,longitude,number,goodID");
    }

    @Test
    void neutralisesFormulaPrefixesInEveryTextColumnIncludingLegacyIstatCodes() {
        for (var prefix : List.of("=", "+", "-", "@", "\t", "\r", "\n")) {
            var value = prefix + "SUM(1+1)";
            var safe = new AssetFormRow(1L, value, value, value, value, value, value, 1, 2, 3, 4).forSpreadsheet();
            assertThat(List.of(safe.region(), safe.province(), safe.municipality(), safe.address(), safe.name(), safe.istatCode()))
                    .allMatch(cell -> cell.equals("'" + value));
        }
    }
}
