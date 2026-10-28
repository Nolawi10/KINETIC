"""
Signal filtering for KINETIC sensor data.

Implements low-pass, high-pass, and band-pass filtering using scipy.
"""

import numpy as np
from scipy import signal
from typing import Optional, Tuple


class SignalFilter:
    """
    Apply digital filters to sensor signals.
    """
    
    def __init__(
        self,
        sampling_frequency: float,
        filter_type: str = "bandpass",
        low_cutoff: Optional[float] = None,
        high_cutoff: Optional[float] = None,
        order: int = 4
    ):
        """
        Initialize the signal filter.
        
        Args:
            sampling_frequency: Sampling frequency in Hz
            filter_type: Type of filter ("lowpass", "highpass", "bandpass")
            low_cutoff: Low cutoff frequency in Hz (for highpass/bandpass)
            high_cutoff: High cutoff frequency in Hz (for lowpass/bandpass)
            order: Filter order
        """
        self.sampling_frequency = sampling_frequency
        self.filter_type = filter_type
        self.low_cutoff = low_cutoff
        self.high_cutoff = high_cutoff
        self.order = order
        
        # Design filter
        self.b, self.a = self._design_filter()
    
    def _design_filter(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Design the Butterworth filter.
        
        Returns:
            Tuple of (b, a) filter coefficients
        """
        nyquist = self.sampling_frequency / 2
        
        if self.filter_type == "lowpass":
            if self.high_cutoff is None:
                raise ValueError("high_cutoff required for lowpass filter")
            wn = self.high_cutoff / nyquist
            b, a = signal.butter(self.order, wn, btype='low')
        
        elif self.filter_type == "highpass":
            if self.low_cutoff is None:
                raise ValueError("low_cutoff required for highpass filter")
            wn = self.low_cutoff / nyquist
            b, a = signal.butter(self.order, wn, btype='high')
        
        elif self.filter_type == "bandpass":
            if self.low_cutoff is None or self.high_cutoff is None:
                raise ValueError("Both low_cutoff and high_cutoff required for bandpass filter")
            wn = [self.low_cutoff / nyquist, self.high_cutoff / nyquist]
            b, a = signal.butter(self.order, wn, btype='bandpass')
        
        else:
            raise ValueError(f"Unknown filter type: {self.filter_type}")
        
        return b, a
    
    def filter_signal(self, data: np.ndarray, axis: int = -1) -> np.ndarray:
        """
        Apply filter to signal.
        
        Args:
            data: Input signal
            axis: Axis along which to filter
            
        Returns:
            Filtered signal
        """
        # Use filtfilt for zero-phase filtering
        filtered = signal.filtfilt(self.b, self.a, data, axis=axis)
        return filtered
    
    def reset_parameters(
        self,
        filter_type: Optional[str] = None,
        low_cutoff: Optional[float] = None,
        high_cutoff: Optional[float] = None,
        order: Optional[int] = None
    ) -> None:
        """
        Reset filter parameters.
        
        Args:
            filter_type: New filter type
            low_cutoff: New low cutoff
            high_cutoff: New high cutoff
            order: New filter order
        """
        if filter_type is not None:
            self.filter_type = filter_type
        if low_cutoff is not None:
            self.low_cutoff = low_cutoff
        if high_cutoff is not None:
            self.high_cutoff = high_cutoff
        if order is not None:
            self.order = order
        
        self.b, self.a = self._design_filter()
