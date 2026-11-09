package com.bimap;

import com.bimap.model.AssetForm;
import com.bimap.model.User;
import com.bimap.repository.AssetFormRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AssetApiTest extends ApiTest {

    private static final String FORM = """
            {"region": "Piemonte", "province": "Alessandria", "municipality": "Cremolino", "address": "via Umberto I",
             "number": 3, "goodNaming": "Complesso dell antica porta", "goodID": 7168, "istatCode": "006061",
             "latitude": 44.637512, "longitude": 8.585214}""";

    @Autowired
    private AssetFormRepository forms;

    private String token;

    @BeforeEach
    void signIn() throws Exception {
        token = bearer(tokenFor(User.Role.USER));
    }

    @Test
    void listsAllRegisteredAssetsWithTheirOriginalFields() throws Exception {
        as(get("/assets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(687)))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].idbene").value(7168))
                .andExpect(jsonPath("$[0].prov").value("AL"))
                .andExpect(jsonPath("$[0].comune").value("CREMOLINO"))
                .andExpect(jsonPath("$[0].indirizzo").value("Roma , via"))
                .andExpect(jsonPath("$[0].civico").value(0))
                .andExpect(jsonPath("$[0].localizzazione").value("via Umberto I"))
                .andExpect(jsonPath("$[0].denominazione").value("Complesso dell antica porta"))
                .andExpect(jsonPath("$[0].provvTutela").value("DD n 027 del 22/04/2015"))
                .andExpect(jsonPath("$[0].proprieta").value("Privata + Ente pubblico"))
                .andExpect(jsonPath("$[0].catato").exists())
                .andExpect(jsonPath("$[0].trascrizione").value("02/07/2015 ai nn 2279/1717"))
                .andExpect(jsonPath("$[0].vincolo").value("Vincolo diretto"));
    }

    @Test
    void searchesPlacesCaseInsensitivelyWithAtMostFourResults() throws Exception {
        as(get("/places/regions").param("q", "piem")).andExpect(status().isOk()).andExpect(jsonPath("$", contains("Piemonte")));
        as(get("/places/provinces").param("q", "TORI")).andExpect(jsonPath("$", contains("Torino")));
        as(get("/places/municipalities").param("q", "a")).andExpect(jsonPath("$", hasSize(4)));
        as(get("/places/municipalities").param("q", "d'Ivrea")).andExpect(jsonPath("$[0]").value("Albiano d'Ivrea"));
        as(get("/places/municipalities").param("q", "a_b")).andExpect(jsonPath("$", hasSize(0)));
        as(get("/places/municipalities").param("q", "%")).andExpect(status().isBadRequest());
        as(get("/places/municipalities").param("q", "zzzz")).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void validatesPlaceQueries() throws Exception {
        as(get("/places/regions")).andExpect(status().isBadRequest());
        as(get("/places/regions").param("q", " ")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.q").exists());
        as(get("/places/regions").param("q", "x".repeat(101))).andExpect(status().isBadRequest());
        as(get("/places/regions").param("q", "<svg onload=alert(1)>")).andExpect(status().isBadRequest());
    }

    @Test
    void rejectsMarkupFormulasAndControlCharactersInForms() throws Exception {
        for (var dirty : new String[] {"<img src=x onerror=alert(1)>", "=cmd|' /C calc'!A0", "@SUM(A1)", "a\\nb", "${jndi:ldap://x}"}) {
            as(json(post("/forms"), FORM.replace("via Umberto I", dirty)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.address").exists());
        }
    }

    @Test
    void savesAFormAndEchoesItWithItsId() throws Exception {
        as(json(post("/forms"), FORM))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.region").value("Piemonte"))
                .andExpect(jsonPath("$.province").value("Alessandria"))
                .andExpect(jsonPath("$.municipality").value("Cremolino"))
                .andExpect(jsonPath("$.address").value("via Umberto I"))
                .andExpect(jsonPath("$.number").value(3))
                .andExpect(jsonPath("$.goodNaming").value("Complesso dell antica porta"))
                .andExpect(jsonPath("$.goodID").value(7168))
                .andExpect(jsonPath("$.istatCode").value("006061"))
                .andExpect(jsonPath("$.latitude").value(44.637512))
                .andExpect(jsonPath("$.longitude").value(8.585214));
    }

    @Test
    void acceptsAFormWithoutIstatCode() throws Exception {
        as(json(post("/forms"), FORM.replace("\"006061\"", "null"))).andExpect(status().isCreated()).andExpect(jsonPath("$.istatCode").isEmpty());
    }

    @Test
    void rejectsInvalidForms() throws Exception {
        for (var invalid : new String[]{
                FORM.replace("44.637512", "90.5"),
                FORM.replace("8.585214", "-180.1"),
                FORM.replace("44.637512", "\"NaN\""),
                FORM.replace("\"latitude\": 44.637512,", ""),
                FORM.replace("\"006061\"", "\"6061\""),
                FORM.replace("\"Piemonte\"", "\"  \""),
                FORM.replace("\"via Umberto I\"", "\"" + "v".repeat(256) + "\""),
                FORM.replace("\"number\": 3", "\"number\": -1"),
                FORM.replace("\"number\": 3,", ""),
                FORM.replace("\"number\": 3", "\"number\": null"),
                FORM.replace("\"number\": 3", "\"number\": 3.5"),
                FORM.replace("\"goodID\": 7168,", ""),
                FORM.replace("\"goodID\": 7168", "\"goodID\": null"),
                FORM.replace("\"goodID\": 7168", "\"goodID\": 7168.5"),
                FORM.replace("\"goodID\": 7168", "\"goodID\": 2147483647"),
                FORM.replace("\"goodID\": 7168", "\"goodID\": -5"),
                FORM.replace("\"number\": 3", "\"number\": \"three\""),
                "[]",
                ""}) {
            as(json(post("/forms"), invalid)).andExpect(status().isBadRequest());
        }
    }

    @Test
    void ignoresAnIdSentByTheClient() throws Exception {
        var body = as(json(post("/forms"), FORM.replace("{", "{\"id\": 424242,"))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("424242");
    }

    @Test
    void acceptsAnUnlistedAssetWithAnExplicitZeroId() throws Exception {
        as(json(post("/forms"), FORM.replace("\"goodID\": 7168", "\"goodID\": 0")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.goodID").value(0));
    }

    @Test
    void exportsFormsAsCsvAndNeutralisesFormulas() throws Exception {
        as(json(post("/forms"), FORM));
        forms.save(new AssetForm("Piemonte", "Alessandria", "Cremolino", "=HYPERLINK(\"http://evil.example\")", "@SUM(1+1)", 3, 7168, "006061", 44.637512, 8.585214));

        var csv = as(get("/forms/export.csv"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"forms.csv\""))
                .andReturn().getResponse().getContentAsString();

        var lines = csv.lines().toList();
        assertThat(lines.getFirst()).isEqualTo("id,region,province,municipality,address,name,istatCode,latitude,longitude,number,goodID");
        assertThat(lines).hasSize(3);
        assertThat(lines.get(1)).contains(",Piemonte,Alessandria,Cremolino,\"via Umberto I\",\"Complesso dell antica porta\",006061,44.637512,8.585214");
        assertThat(lines.get(1)).endsWith(",3,7168");
        assertThat(lines.get(2)).contains("'=HYPERLINK").contains("'@SUM(1+1)").doesNotContain(",=").doesNotContain(",@");
    }

    private ResultActions as(MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, token));
    }
}
