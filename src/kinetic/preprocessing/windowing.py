"""
Window extraction for sensor signals.

Extracts fixed-length windows around events for feature extraction.
"""

import numpy as np
from typing import Optional, Tuple


class WindowExtractor:
    """
    Extract fixed-length windows from sensor signals.
    """
    
    def __init__(
        self,
        window_duration: float,
        sampling_frequency: float,
        pre_event_duration: float = 0.05,
        overlap: float = 0.0
    ):
        """
        Initialize the window extractor.
        
        Args:
            window_duration: Total window duration in seconds
            sampling_frequency: Sampling frequency in Hz
            pre_event_duration: Duration before event onset in seconds
            overlap: Overlap between windows (0-1)
        """
        self.window_duration = window_duration
        self.sampling_frequency = sampling_frequency
        self.pre_event_duration = pre_event_duration
        self.overlap = overlap
        
        self.window_samples = int(window_duration * sampling_frequency)
        self.pre_event_samples = int(pre_event_duration * sampling_frequency)
    
    def extract_window(
        self,
        data: np.ndarray,
        peak_sample: Optional[int] = None,
        onset_sample: Optional[int] = None
    ) -> np.ndarray:
        """
        Extract a single window centered on an event.
        
        Args:
            data: Input signal (n_samples,) or (n_channels, n_samples)
            peak_sample: Sample index of peak (if available)
            onset_sample: Sample index of event onset
            
        Returns:
            Windowed signal
        """
        # Determine window start
        if onset_sample is not None:
            start_sample = onset_sample - self.pre_event_samples
        elif peak_sample is not None:
            start_sample = peak_sample - self.pre_event_samples
        else:
            # Center of signal
            if data.ndim == 1:
                center = len(data) // 2
            else:
                center = data.shape[1] // 2
            start_sample = center - self.pre_event_samples
        
        # Ensure start is valid
        start_sample = max(0, start_sample)
        
        # Extract window
        end_sample = start_sample + self.window_samples
        
        if data.ndim == 1:
            if end_sample > len(data):
                # Pad with zeros if window extends beyond signal
                window = np.zeros(self.window_samples)
                available = len(data) - start_sample
                window[:available] = data[start_sample:]
            else:
                window = data[start_sample:end_sample]
        else:
            n_channels = data.shape[0]
            if end_sample > data.shape[1]:
                window = np.zeros((n_channels, self.window_samples))
                available = data.shape[1] - start_sample
                window[:, :available] = data[:, start_sample:]
            else:
                window = data[:, start_sample:end_sample]
        
        return window
    
    def extract_overlapping_windows(
        self,
        data: np.ndarray
    ) -> list:
        """
        Extract overlapping windows from a long signal.
        
        Args:
            data: Input signal
            
        Returns:
            List of windows
        """
        if data.ndim == 1:
            n_samples = len(data)
        else:
            n_samples = data.shape[1]
        
        step_samples = int(self.window_samples * (1 - self.overlap))
        windows = []
        
        for start in range(0, n_samples - self.window_samples + 1, step_samples):
            if data.ndim == 1:
                window = data[start:start + self.window_samples]
            else:
                window = data[:, start:start + self.window_samples]
            windows.append(window)
        
        return windows
