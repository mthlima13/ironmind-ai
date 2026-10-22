package com.ironmind.workout.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class VolumeCalculatorTest {

    private final VolumeCalculator volumeCalculator = new VolumeCalculator();

    @Test
    @DisplayName("calculates the volume of a set as load multiplied by repetitions")
    void calculatesVolumeOfASet() {
        BigDecimal volume = volumeCalculator.volumeOf(new BigDecimal("100.00"), 10);

        assertThat(volume).isEqualByComparingTo("1000.00");
    }

    @Test
    @DisplayName("keeps the fractional part of the load")
    void keepsFractionalLoad() {
        BigDecimal volume = volumeCalculator.volumeOf(new BigDecimal("22.50"), 8);

        assertThat(volume).isEqualByComparingTo("180.00");
    }

    @Test
    @DisplayName("returns zero when the set has no repetitions")
    void returnsZeroWhenThereAreNoRepetitions() {
        assertThat(volumeCalculator.volumeOf(new BigDecimal("100.00"), 0)).isEqualByComparingTo("0.00");
        assertThat(volumeCalculator.volumeOf(new BigDecimal("100.00"), null)).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("returns zero for bodyweight movements, which have no external load")
    void returnsZeroForBodyweightMovements() {
        assertThat(volumeCalculator.volumeOf(null, 15)).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("rejects a negative load")
    void rejectsNegativeLoad() {
        assertThatThrownBy(() -> volumeCalculator.volumeOf(new BigDecimal("-10.00"), 10))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("carga");
    }

    @Test
    @DisplayName("sums the volume of every valid set of the collection")
    void sumsTheVolumeOfEverySet() {
        List<VolumeCalculator.SetVolume> sets = List.of(
                new VolumeCalculator.SetVolume(new BigDecimal("100.00"), 10),
                new VolumeCalculator.SetVolume(new BigDecimal("80.00"), 8),
                new VolumeCalculator.SetVolume(null, 20),
                new VolumeCalculator.SetVolume(new BigDecimal("60.00"), 0));

        BigDecimal total = volumeCalculator.totalVolume(sets);

        assertThat(total).isEqualByComparingTo("1640.00");
    }

    @Test
    @DisplayName("returns zero when there is no set to sum")
    void returnsZeroForAnEmptyCollection() {
        assertThat(volumeCalculator.totalVolume(List.of())).isEqualByComparingTo("0.00");
    }
}
