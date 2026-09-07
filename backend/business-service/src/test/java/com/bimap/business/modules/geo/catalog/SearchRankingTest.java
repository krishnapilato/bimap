package com.bimap.business.modules.geo.catalog;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.Comparator;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/// @author Khova Krishna Pilato
class SearchRankingTest {

    @ParameterizedTest(name = "{0} folds to {1}")
    @CsvSource({
            "Forlì,             forli",
            "Sant'Agata,        sant agata",
            "Reggio nell'Emilia,reggio nell emilia",
            "MILANO,            milano",
            "Bolzano-Bozen,     bolzano bozen",
            "  Trento  ,        trento"
    })
    @DisplayName("folding removes accents, punctuation and case")
    void foldsForSearch(String input, String expected) {
        assertThat(SearchRanking.fold(input)).isEqualTo(expected);
    }

    @Test
    @DisplayName("an accented name is found by its unaccented spelling")
    void matchesAcrossAccents() {
        assertThat(SearchRanking.rank("Forlì", SearchRanking.fold("forli"))).isPresent();
        assertThat(SearchRanking.rank("Sant'Agata", SearchRanking.fold("sant agata"))).isPresent();
    }

    @Test
    @DisplayName("a prefix match outranks a match in the middle of the name")
    void prefixWins() {
        var query = SearchRanking.fold("mila");

        var prefix = SearchRanking.rank("Milano", query).orElseThrow();
        var contains = SearchRanking.rank("Bagnolo di Milano", query).orElseThrow();

        assertThat(prefix).isLessThan(contains);
    }

    @Test
    @DisplayName("a match at the start of a later word outranks one mid-word")
    void wordStartBeatsMidWord() {
        var query = SearchRanking.fold("agata");

        var wordStart = SearchRanking.rank("Sant Agata", query).orElseThrow();
        var midWord = SearchRanking.rank("Xagatax", query).orElseThrow();

        assertThat(wordStart).isLessThan(midWord);
    }

    @Test
    @DisplayName("a name that does not contain the query does not match")
    void noMatchIsEmpty() {
        assertThat(SearchRanking.rank("Milano", SearchRanking.fold("zzz"))).isEmpty();
    }

    @Test
    @DisplayName("an empty query matches everything, so an untouched field still offers options")
    void emptyQueryMatchesAll() {
        assertThat(SearchRanking.rank("Milano", "")).isPresent();
    }

    @Test
    @DisplayName("the gatherer keeps the best n, in order, without sorting everything")
    void keepsBestN() {
        var shuffled = List.of(9, 3, 7, 1, 8, 2, 5, 4, 6, 0);

        var best = shuffled.stream()
                .gather(SearchRanking.best(Comparator.<Integer>naturalOrder(), 3))
                .toList();

        assertThat(best).containsExactly(0, 1, 2);
    }

    @Test
    @DisplayName("asking for more than the stream holds returns everything it has")
    void handlesShortStreams() {
        var best = IntStream.range(0, 2).boxed()
                .gather(SearchRanking.best(Comparator.<Integer>naturalOrder(), 5))
                .toList();

        assertThat(best).containsExactly(0, 1);
    }

    @Test
    @DisplayName("an empty stream yields nothing rather than failing")
    void handlesEmptyStreams() {
        assertThat(List.<Integer>of().stream()
                .gather(SearchRanking.best(Comparator.<Integer>naturalOrder(), 5))
                .toList())
                .isEmpty();
    }
}
