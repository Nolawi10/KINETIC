"""
Piezoelectric signal feature extraction.

Extracts time-domain, frequency-domain, and cross-channel features
from piezoelectric sensor waveforms.
"""

import numpy as np
from scipy import signal as signal_module
from scipy.fft import fft, fftfreq
from typing import Dict, List, Optional


class PiezoFeatureExtractor:
    """
    Extract features from piezoelectric sensor waveforms.
    """
    
    def __init__(self, sampling_frequency: float, config: Optional[Dict] = None):
        """
        Initialize the piezo feature extractor.
        
        Args:
            sampling_frequency: Sampling frequency in Hz
            config: Feature configuration dictionary
        """
        self.sampling_frequency = sampling_frequency
        self.config = config or {}
        
        # Feature selection
        self.time_domain_config = self.config.get("time_domain", {})
        self.frequency_domain_config = self.config.get("frequency_domain", {})
        self.cross_channel_config = self.config.get("cross_channel", {})
        self.noise_config = self.config.get("noise", {})
    
    def extract_features(
        self,
        waveforms: np.ndarray,
        timestamps: Optional[np.ndarray] = None
    ) -> Dict[str, float]:
        """
        Extract all features from piezo waveforms.
        
        Args:
            waveforms: (n_channels, n_samples) array
            timestamps: (n_samples,) array of timestamps
            
        Returns:
            Dictionary of feature names and values
        """
        features = {}
        
        # Time-domain features (from primary channel or average)
        primary_channel = waveforms[0]
        
        if self.time_domain_config.get("max_amplitude", True):
            features["max_amplitude"] = np.max(np.abs(primary_channel))
        
        if self.time_domain_config.get("peak_to_peak", True):
            features["peak_to_peak"] = np.max(primary_channel) - np.min(primary_channel)
        
        if self.time_domain_config.get("rms", True):
            features["rms"] = np.sqrt(np.mean(primary_channel ** 2))
        
        if self.time_domain_config.get("signal_energy", True):
            features["signal_energy"] = np.sum(primary_channel ** 2) / self.sampling_frequency
        
        if self.time_domain_config.get("signal_integral", True):
            features["signal_integral"] = np.sum(np.abs(primary_channel)) / self.sampling_frequency
        
        # Rise and decay time
        if self.time_domain_config.get("rise_time", True) or self.time_domain_config.get("decay_time", True):
            rise_time, decay_time = self._extract_rise_decay_times(primary_channel, timestamps)
            if self.time_domain_config.get("rise_time", True):
                features["rise_time"] = rise_time
            if self.time_domain_config.get("decay_time", True):
                features["decay_time"] = decay_time
        
        if self.time_domain_config.get("pulse_duration", True):
            features["pulse_duration"] = self._extract_pulse_duration(primary_channel, timestamps)
        
        if self.time_domain_config.get("n_peaks", True):
            features["n_peaks"] = self._count_peaks(primary_channel)
        
        # Frequency-domain features
        if self.frequency_domain_config.get("dominant_frequency", True):
            features["dominant_frequency"] = self._extract_dominant_frequency(primary_channel)
        
        if self.frequency_domain_config.get("spectral_centroid", True):
            features["spectral_centroid"] = self._extract_spectral_centroid(primary_channel)
        
        if self.frequency_domain_config.get("spectral_bandwidth", True):
            features["spectral_bandwidth"] = self._extract_spectral_bandwidth(primary_channel)
        
        if self.frequency_domain_config.get("selected_band_energies"):
            band_energies = self._extract_band_energies(
                primary_channel,
                self.frequency_domain_config["selected_band_energies"]
            )
            for band, energy in band_energies.items():
                features[f"band_energy_{band}"] = energy
        
        # Cross-channel features
        if waveforms.shape[0] > 1:
            if self.cross_channel_config.get("amplitude_ratios", True):
                ratios = self._extract_amplitude_ratios(waveforms)
                for i, ratio in enumerate(ratios):
                    features[f"amplitude_ratio_{i}"] = ratio
            
            if self.cross_channel_config.get("time_diff_peaks", True):
                time_diffs = self._extract_peak_time_diffs(waveforms, timestamps)
                for i, diff in enumerate(time_diffs):
                    features[f"peak_time_diff_{i}"] = diff
        
        # Noise features
        if self.noise_config.get("snr_estimate", True):
            features["snr_estimate"] = self._estimate_snr(primary_channel)
        
        return features
    
    def _extract_rise_decay_times(
        self,
        signal: np.ndarray,
        timestamps: Optional[np.ndarray]
    ) -> Tuple[float, float]:
        """Extract rise and decay times."""
        if timestamps is None:
            timestamps = np.arange(len(signal)) / self.sampling_frequency
        
        # Find peak
        peak_idx = np.argmax(np.abs(signal))
        peak_value = np.abs(signal[peak_idx])
        
        # 10% and 90% thresholds
        threshold_10 = 0.1 * peak_value
        threshold_90 = 0.9 * peak_value
        
        # Find rise time (10% to 90% before peak)
        rise_start = None
        for i in range(peak_idx - 1, -1, -1):
            if np.abs(signal[i]) < threshold_10:
                rise_start = i
                break
        
        rise_end = None
        for i in range(peak_idx - 1, -1, -1):
            if np.abs(signal[i]) < threshold_90:
                rise_end = i
                break
        
        if rise_start is not None and rise_end is not None:
            rise_time = timestamps[rise_end] - timestamps[rise_start]
        else:
            rise_time = 0.0
        
        # Find decay time (90% to 10% after peak)
        decay_start = None
        for i in range(peak_idx + 1, len(signal)):
            if np.abs(signal[i]) < threshold_90:
                decay_start = i
                break
        
        decay_end = None
        for i in range(peak_idx + 1, len(signal)):
            if np.abs(signal[i]) < threshold_10:
                decay_end = i
                break
        
        if decay_start is not None and decay_end is not None:
            decay_time = timestamps[decay_end] - timestamps[decay_start]
        else:
            decay_time = 0.0
        
        return rise_time, decay_time
    
    def _extract_pulse_duration(
        self,
        signal: np.ndarray,
        timestamps: Optional[np.ndarray]
    ) -> float:
        """Extract pulse duration above threshold."""
        if timestamps is None:
            timestamps = np.arange(len(signal)) / self.sampling_frequency
        
        threshold = 0.1 * np.max(np.abs(signal))
        above_threshold = np.abs(signal) > threshold
        
        if not np.any(above_threshold):
            return 0.0
        
        # Find first and last above threshold
        first = np.where(above_threshold)[0][0]
        last = np.where(above_threshold)[0][-1]
        
        return timestamps[last] - timestamps[first]
    
    def _count_peaks(self, signal: np.ndarray) -> int:
        """Count number of peaks in signal."""
        peaks, _ = signal_module.find_peaks(np.abs(signal))
        return len(peaks)
    
    def _extract_dominant_frequency(self, signal: np.ndarray) -> float:
        """Extract dominant frequency using FFT."""
        n = len(signal)
        fft_values = fft(signal)
        freqs = fftfreq(n, 1 / self.sampling_frequency)
        
        # Get magnitude spectrum
        magnitude = np.abs(fft_values)
        
        # Ignore DC component and negative frequencies
        positive_freqs = freqs[:n // 2]
        positive_magnitude = magnitude[:n // 2]
        
        # Find dominant frequency (excluding DC)
        if len(positive_magnitude) > 1:
            dominant_idx = np.argmax(positive_magnitude[1:]) + 1
            return abs(positive_freqs[dominant_idx])
        else:
            return 0.0
    
    def _extract_spectral_centroid(self, signal: np.ndarray) -> float:
        """Extract spectral centroid."""
        n = len(signal)
        fft_values = fft(signal)
        freqs = fftfreq(n, 1 / self.sampling_frequency)
        
        magnitude = np.abs(fft_values)
        positive_freqs = freqs[:n // 2]
        positive_magnitude = magnitude[:n // 2]
        
        if np.sum(positive_magnitude) > 0:
            centroid = np.sum(positive_freqs * positive_magnitude) / np.sum(positive_magnitude)
            return abs(centroid)
        else:
            return 0.0
    
    def _extract_spectral_bandwidth(self, signal: np.ndarray) -> float:
        """Extract spectral bandwidth."""
        n = len(signal)
        fft_values = fft(signal)
        freqs = fftfreq(n, 1 / self.sampling_frequency)
        
        magnitude = np.abs(fft_values)
        positive_freqs = freqs[:n // 2]
        positive_magnitude = magnitude[:n // 2]
        
        centroid = self._extract_spectral_centroid(signal)
        
        if np.sum(positive_magnitude) > 0:
            bandwidth = np.sqrt(
                np.sum(((positive_freqs - centroid) ** 2) * positive_magnitude) / 
                np.sum(positive_magnitude)
            )
            return bandwidth
        else:
            return 0.0
    
    def _extract_band_energies(
        self,
        signal: np.ndarray,
        bands: List[float]
    ) -> Dict[str, float]:
        """Extract energy in frequency bands."""
        n = len(signal)
        fft_values = fft(signal)
        freqs = fftfreq(n, 1 / self.sampling_frequency)
        
        magnitude = np.abs(fft_values)
        positive_freqs = freqs[:n // 2]
        positive_magnitude = magnitude[:n // 2]
        
        band_energies = {}
        prev_cutoff = 0
        
        for cutoff in bands:
            # Find indices in band
            band_mask = (positive_freqs >= prev_cutoff) & (positive_freqs < cutoff)
            band_energy = np.sum(positive_magnitude[band_mask] ** 2)
            band_energies[f"{prev_cutoff}_{cutoff}"] = band_energy
            prev_cutoff = cutoff
        
        # Add remaining energy
        band_mask = positive_freqs >= prev_cutoff
        band_energy = np.sum(positive_magnitude[band_mask] ** 2)
        band_energies[f"{prev_cutoff}_inf"] = band_energy
        
        return band_energies
    
    def _extract_amplitude_ratios(self, waveforms: np.ndarray) -> List[float]:
        """Extract amplitude ratios between channels."""
        primary_channel = waveforms[0]
        primary_max = np.max(np.abs(primary_channel))
        
        ratios = []
        for i in range(1, waveforms.shape[0]):
            channel_max = np.max(np.abs(waveforms[i]))
            if primary_max > 0:
                ratio = channel_max / primary_max
            else:
                ratio = 0.0
            ratios.append(ratio)
        
        return ratios
    
    def _extract_peak_time_diffs(
        self,
        waveforms: np.ndarray,
        timestamps: Optional[np.ndarray]
    ) -> List[float]:
        """Extract time differences between channel peaks."""
        if timestamps is None:
            timestamps = np.arange(waveforms.shape[1]) / self.sampling_frequency
        
        primary_channel = waveforms[0]
        primary_peak_idx = np.argmax(np.abs(primary_channel))
        primary_peak_time = timestamps[primary_peak_idx]
        
        time_diffs = []
        for i in range(1, waveforms.shape[0]):
            channel_peak_idx = np.argmax(np.abs(waveforms[i]))
            channel_peak_time = timestamps[channel_peak_idx]
            time_diffs.append(channel_peak_time - primary_peak_time)
        
        return time_diffs
    
    def _estimate_snr(self, signal: np.ndarray) -> float:
        """Estimate signal-to-noise ratio."""
        signal_power = np.mean(signal ** 2)
        
        # Estimate noise from first 10% of signal (assumed to be pre-event)
        noise_samples = max(1, len(signal) // 10)
        noise_power = np.mean(signal[:noise_samples] ** 2)
        
        if noise_power > 0:
            snr = 10 * np.log10(signal_power / noise_power)
        else:
            snr = float('inf')
        
        return snr
