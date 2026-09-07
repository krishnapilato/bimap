package com.bimap.business.modules.geo.catalog;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.OptionalInt;
import java.util.PriorityQueue;
import java.util.stream.Gatherer;

/// Matching and ordering rules shared by every geographic autocomplete.
///
/// Italian place names carry accents and apostrophes that nobody types into a search box, so
/// matching happens on a folded form: Forlì matches "forli", Sant Agata matches "sant agata".
///
/// @author Khova Krishna Pilato
public final class SearchRanking {

    /// Lower is better. A name that starts with the query beats one that merely contains it.
    private static final int RANK_PREFIX = 0;
    private static final int RANK_WORD_START = 1;
    private static final int RANK_CONTAINS = 2;

    private SearchRanking() {
    }

    /// Strips diacritics and punctuation so search is insensitive to both.
    public static String fold(String value) {
        if (value == null) {
            return "";
        }
        var decomposed = Normalizer.normalize(value, Normalizer.Form.NFD);
        var builder = new StringBuilder(decomposed.length());

        decomposed.codePoints().forEach(codePoint -> {
            if (Character.getType(codePoint) == Character.NON_SPACING_MARK) {
                return;
            }
            if (Character.isLetterOrDigit(codePoint)) {
                builder.appendCodePoint(Character.toLowerCase(codePoint));
            } else if (Character.isWhitespace(codePoint) || codePoint == '-' || codePoint == '\'') {
                builder.append(' ');
            }
        });
        return builder.toString().strip();
    }

    /// How well `candidate` answers `foldedQuery`, or empty when it does not.
    public static OptionalInt rank(String candidate, String foldedQuery) {
        var folded = fold(candidate);

        if (foldedQuery.isEmpty()) {
            return OptionalInt.of(RANK_PREFIX);
        }
        if (folded.startsWith(foldedQuery)) {
            return OptionalInt.of(RANK_PREFIX);
        }
        if (folded.contains(" " + foldedQuery)) {
            return OptionalInt.of(RANK_WORD_START);
        }
        return folded.contains(foldedQuery) ? OptionalInt.of(RANK_CONTAINS) : OptionalInt.empty();
    }

    /// Keeps the best `limit` elements without sorting the whole stream.
    ///
    /// Autocomplete asks for five rows out of nearly eight thousand. Sorting all of them to throw
    /// away 99.9% is wasted work, so this holds a bounded heap of the current best instead: one
    /// comparison per element, and only the survivors are ever ordered.
    public static <T> Gatherer<T, ?, T> best(Comparator<? super T> order, int limit) {
        return Gatherer.ofSequential(
                () -> new PriorityQueue<T>(Math.max(1, limit), order.reversed()),
                (heap, element, downstream) -> {
                    heap.offer(element);
                    if (heap.size() > limit) {
                        heap.poll();
                    }
                    return true;
                },
                (heap, downstream) -> heap.stream().sorted(order).forEach(downstream::push));
    }
}
