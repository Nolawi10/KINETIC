"""
Synthetic piezoelectric sensor simulator.

Generates realistic impact waveforms using a damped oscillation model
with configurable parameters for different target zones and movement types.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import warnings


@dataclass
class PiezoWaveformParams:
    """Parameters for piezoelectric waveform generation."""
    amplitude: float
    rise_time: float
    decay_time: float
    pulse_duration: float
    ringing_frequency: float
    damping_ratio: float
    onset_time: float
    background_noise_std: float
    electronic_noise_std: float
    gain: float
    saturation_threshold: float


class PiezoSimulator:
    """
    Synthetic piezoelectric sensor simulator.
    
    Generates realistic impact waveforms for instrumented sports-training targets
    using a physically motivated damped-oscillation model with configurable noise,
    cross-talk, and sensor variation.
    """
    
    # Default target zone labels
    DEFAULT_ZONES = [
        "head_zone",
        "left_side_zone", 
        "right_side_zone",
        "chest_zone",
        "waist_zone"
    ]
    
    def __init__(self, config: Dict):
        """
        Initialize the piezo simulator.
        
        Args:
            config: Configuration dictionary from simulation.yaml
        """
        self.config = config
        self.piezo_config = config.get("piezo", {})
        
        # Sampling parameters
        self.sampling_frequency = self.piezo_config.get("sampling_frequency", 2000)
        self.window_duration = self.piezo_config.get("window_duration", 0.3)
        self.pre_event_duration = self.piezo_config.get("pre_event_duration", 0.05)
        self.post_event_duration = self.piezo_config.get("post_event_duration", 0.25)
        
        # Zones
        self.zones = self.piezo_config.get("zones", self.DEFAULT_ZONES)
        self.n_channels = len(self.zones)
        
        # Waveform parameters
        self.waveform_config = self.piezo_config.get("waveform", {})
        self.zone_parameters = self.piezo_config.get("zone_parameters", {})
        
        # ADC parameters
        self.adc_resolution = self.waveform_config.get("adc_resolution", 12)
        self.adc_voltage_range = self.waveform_config.get("adc_voltage_range", [-3.3, 3.3])
        
        # Cross-talk
        self.crosstalk_enabled = self.waveform_config.get("crosstalk_enabled", True)
        self.crosstalk_decay = self.waveform_config.get("crosstalk_decay_factor", 0.3)
        self.crosstalk_delay = self.waveform_config.get("crosstalk_delay", 0.002)
        
        # Sensor variation
        self.sensor_variation_std = self.waveform_config.get("sensor_variation_std", 0.1)
        self.event_variation_std = self.waveform_config.get("event_variation_std", 0.15)
        
        # Initialize sensor-specific variations
        self._init_sensor_variations()
    
    def _init_sensor_variations(self) -> None:
        """Initialize random variations for each sensor channel."""
        np.random.seed(None)  # Use current random state
        
        self.sensor_gains = np.random.normal(
            loc=1.0,
            scale=self.sensor_variation_std,
            size=self.n_channels
        )
        self.sensor_sensitivities = np.random.normal(
            loc=1.0,
            scale=self.sensor_variation_std,
            size=self.n_channels
        )
    
    def _get_zone_params(self, zone: str, movement: str, rng: np.random.Generator) -> PiezoWaveformParams:
        """
        Get waveform parameters for a specific zone and movement.
        
        Args:
            zone: Target zone identifier
            movement: Movement class
            rng: Random number generator
            
        Returns:
            PiezoWaveformParams instance
        """
        # Base parameters from config
        zone_config = self.zone_parameters.get(zone, {})
        base_amplitude = zone_config.get("base_amplitude", 0.8)
        rise_time_mean = zone_config.get("rise_time_mean", 0.01)
        decay_time_mean = zone_config.get("decay_time_mean", 0.05)
        
        # Movement-specific multipliers for improved separability
        movement_config = self.waveform_config.get("movement_parameters", {})
        movement_params = movement_config.get(movement, {})
        
        amp_multiplier = movement_params.get("amplitude_multiplier", 1.0)
        freq_multiplier = movement_params.get("frequency_multiplier", 1.0)
        duration_multiplier = movement_params.get("duration_multiplier", 1.0)
        
        # Apply movement multipliers
        base_amplitude *= amp_multiplier
        rise_time_mean *= duration_multiplier
        decay_time_mean *= duration_multiplier
        
        # Global ranges
        amp_range = self.waveform_config.get("amplitude_range", [0.1, 1.0])
        rise_range = self.waveform_config.get("rise_time_range", [0.005, 0.015])
        decay_range = self.waveform_config.get("decay_time_range", [0.02, 0.08])
        pulse_range = self.waveform_config.get("pulse_duration_range", [0.03, 0.1])
        freq_range = self.waveform_config.get("ringing_frequency_range", [50, 200])
        damping_range = self.waveform_config.get("damping_ratio_range", [0.3, 0.8])
        
        # Adjust frequency range based on movement
        adjusted_freq_range = [freq_range[0] * freq_multiplier, freq_range[1] * freq_multiplier]
        
        # Add event-to-event variation (reduced for better separability)
        amplitude = base_amplitude * rng.normal(1.0, self.event_variation_std * 0.5)
        amplitude = np.clip(amplitude, amp_range[0], amp_range[1])
        
        rise_time = rise_time_mean * rng.normal(1.0, self.event_variation_std * 0.5)
        rise_time = np.clip(rise_time, rise_range[0], rise_range[1])
        
        decay_time = decay_time_mean * rng.normal(1.0, self.event_variation_std * 0.5)
        decay_time = np.clip(decay_time, decay_range[0], decay_range[1])
        
        pulse_duration = rng.uniform(pulse_range[0], pulse_range[1]) * duration_multiplier
        ringing_frequency = rng.uniform(adjusted_freq_range[0], adjusted_freq_range[1])
        damping_ratio = rng.uniform(damping_range[0], damping_range[1])
        
        # Onset time (within pre-event window)
        onset_time = rng.uniform(0, self.pre_event_duration * 0.8)
        
        # Noise parameters (reduced for better separability)
        background_noise_std = self.waveform_config.get("background_noise_std", 0.02) * 0.5
        electronic_noise_std = self.waveform_config.get("electronic_noise_std", 0.01) * 0.5
        
        # Sensor characteristics
        gain = self.waveform_config.get("gain", 1.0)
        saturation_threshold = self.waveform_config.get("saturation_threshold", 2.0)
        
        return PiezoWaveformParams(
            amplitude=amplitude,
            rise_time=rise_time,
            decay_time=decay_time,
            pulse_duration=pulse_duration,
            ringing_frequency=ringing_frequency,
            damping_ratio=damping_ratio,
            onset_time=onset_time,
            background_noise_std=background_noise_std,
            electronic_noise_std=electronic_noise_std,
            gain=gain,
            saturation_threshold=saturation_threshold
        )
    
    def _generate_damped_oscillation(
        self,
        t: np.ndarray,
        params: PiezoWaveformParams,
        rng: np.random.Generator
    ) -> np.ndarray:
        """
        Generate a damped oscillation waveform.
        
        Args:
            t: Time array
            params: Waveform parameters
            rng: Random number generator
            
        Returns:
            Waveform signal
        """
        # Relative time from onset
        t_rel = t - params.onset_time
        
        # Initialize signal
        signal = np.zeros_like(t)
        
        # Only generate after onset
        mask = t_rel >= 0
        
        if np.any(mask):
            t_masked = t_rel[mask]
            
            # Damped oscillation: A * exp(-damping * t) * sin(2 * pi * f * t)
            # Use a more realistic model with rise and decay phases
            
            # Rise phase (approaching peak)
            rise_mask = t_masked < params.rise_time
            if np.any(rise_mask):
                t_rise = t_masked[rise_mask]
                rise_envelope = t_rise / params.rise_time
                signal[mask][rise_mask] = (
                    params.amplitude * rise_envelope * 
                    np.sin(2 * np.pi * params.ringing_frequency * t_rise)
                )
            
            # Decay phase (after peak)
            decay_mask = t_masked >= params.rise_time
            if np.any(decay_mask):
                t_decay = t_masked[decay_mask] - params.rise_time
                decay_envelope = np.exp(-params.damping_ratio * 2 * np.pi * params.ringing_frequency * t_decay)
                signal[mask][decay_mask] = (
                    params.amplitude * decay_envelope * 
                    np.sin(2 * np.pi * params.ringing_frequency * (t_decay + params.rise_time))
                )
        
        # Apply gain
        signal *= params.gain
        
        # Add background noise
        signal += rng.normal(0, params.background_noise_std, size=signal.shape)
        
        # Add electronic noise (higher frequency)
        signal += rng.normal(0, params.electronic_noise_std, size=signal.shape)
        
        # Apply saturation/clipping
        signal = np.clip(signal, -params.saturation_threshold, params.saturation_threshold)
        
        return signal
    
    def _apply_crosstalk(
        self,
        signals: np.ndarray,
        primary_channel: int,
        rng: np.random.Generator
    ) -> np.ndarray:
        """
        Apply cross-talk between sensor channels.
        
        Args:
            signals: Multi-channel signals (n_channels, n_samples)
            primary_channel: Index of channel with primary impact
            rng: Random number generator
            
        Returns:
            Signals with cross-talk applied
        """
        if not self.crosstalk_enabled:
            return signals
        
        n_channels, n_samples = signals.shape
        
        # Calculate distances from primary channel
        distances = np.abs(np.arange(n_channels) - primary_channel)
        
        # Apply cross-talk with delay
        for i in range(n_channels):
            if i != primary_channel:
                # Cross-talk decays with distance
                crosstalk_strength = np.exp(-self.crosstalk_decay * distances[i])
                
                # Delay in samples
                delay_samples = int(self.crosstalk_delay * self.sampling_frequency)
                
                # Apply delayed, attenuated signal
                if delay_samples < n_samples:
                    crosstalk_signal = np.roll(
                        signals[primary_channel] * crosstalk_strength,
                        delay_samples
                    )
                    # Zero out the wrapped part
                    crosstalk_signal[:delay_samples] = 0
                    signals[i] += crosstalk_signal
        
        return signals
    
    def _quantize_adc(self, signal: np.ndarray) -> np.ndarray:
        """
        Apply ADC quantization to signal.
        
        Args:
            signal: Analog signal
            
        Returns:
            Quantized digital signal
        """
        # Map voltage range to ADC levels
        voltage_min, voltage_max = self.adc_voltage_range
        n_levels = 2 ** self.adc_resolution
        
        # Normalize to [0, 1]
        normalized = (signal - voltage_min) / (voltage_max - voltage_min)
        normalized = np.clip(normalized, 0, 1)
        
        # Quantize
        quantized = np.round(normalized * (n_levels - 1)) / (n_levels - 1)
        
        # Map back to voltage range
        quantized_voltage = quantized * (voltage_max - voltage_min) + voltage_min
        
        return quantized_voltage
    
    def generate_event(
        self,
        target_zone: str,
        rng: Optional[np.random.Generator] = None
    ) -> Tuple[np.ndarray, np.ndarray, Dict]:
        """
        Generate a multi-channel piezo waveform for a single event.
        
        Args:
            target_zone: Target zone where impact occurs
            rng: Random number generator (uses default if None)
            
        Returns:
            Tuple of (waveforms, timestamps, metadata)
            - waveforms: (n_channels, n_samples) array
            - timestamps: (n_samples,) array in seconds
            - metadata: Dictionary with event parameters
        """
        if rng is None:
            rng = np.random.default_rng()
        
        # Get zone index
        try:
            primary_channel = self.zones.index(target_zone)
        except ValueError:
            warnings.warn(f"Unknown zone {target_zone}, using first channel")
            primary_channel = 0
        
        # Time array
        n_samples = int(self.sampling_frequency * self.window_duration)
        t = np.linspace(0, self.window_duration, n_samples)
        
        # Get waveform parameters for primary zone
        params = self._get_zone_params(target_zone, rng)
        
        # Initialize signals
        signals = np.zeros((self.n_channels, n_samples))
        
        # Generate primary channel signal
        signals[primary_channel] = self._generate_damped_oscillation(t, params, rng)
        
        # Apply sensor-specific gain and sensitivity
        signals *= self.sensor_gains[:, np.newaxis]
        signals *= self.sensor_sensitivities[:, np.newaxis]
        
        # Apply cross-talk
        signals = self._apply_crosstalk(signals, primary_channel, rng)
        
        # Apply ADC quantization
        signals = self._quantize_adc(signals)
        
        # Metadata
        metadata = {
            "target_zone": target_zone,
            "primary_channel": primary_channel,
            "amplitude": params.amplitude,
            "rise_time": params.rise_time,
            "decay_time": params.decay_time,
            "pulse_duration": params.pulse_duration,
            "ringing_frequency": params.ringing_frequency,
            "damping_ratio": params.damping_ratio,
            "onset_time": params.onset_time,
            "sampling_frequency": self.sampling_frequency,
            "n_channels": self.n_channels,
            "n_samples": n_samples,
            "sensor_gains": self.sensor_gains.tolist(),
            "sensor_sensitivities": self.sensor_sensitivities.tolist()
        }
        
        return signals, t, metadata
    
    def generate_batch(
        self,
        events: List[Dict],
        rng: Optional[np.random.Generator] = None
    ) -> List[Tuple[np.ndarray, np.ndarray, Dict]]:
        """
        Generate multiple events.
        
        Args:
            events: List of event dictionaries with 'target_zone' key
            rng: Random number generator
            
        Returns:
            List of (waveforms, timestamps, metadata) tuples
        """
        if rng is None:
            rng = np.random.default_rng()
        
        results = []
        for event in events:
            target_zone = event.get("target_zone", "chest_zone")
            waveforms, t, metadata = self.generate_event(target_zone, rng)
            metadata.update(event)
            results.append((waveforms, t, metadata))
        
        return results
