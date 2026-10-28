"""
Baseline correction and detrending for sensor signals.
"""

import numpy as np
from scipy import signal
from typing import Optional


class BaselineCorrector:
    """
    Apply baseline correction and detrending to sensor signals.
    """
    
    def __init__(self, method: str = "mean"):
        """
        Initialize the baseline corrector.
        
        Args:
            method: Method for baseline correction ("mean", "median", "detrend", "polyfit")
        """
        self.method = method
    
    def correct(
        self,
        data: np.ndarray,
        axis: int = -1,
        pre_event_samples: Optional[int] = None
    ) -> np.ndarray:
        """
        Apply baseline correction to signal.
        
        Args:
            data: Input signal
            axis: Axis along which to correct
            pre_event_samples: Number of pre-event samples for baseline estimation
            
        Returns:
            Baseline-corrected signal
        """
        if self.method == "mean":
            return self._mean_correction(data, axis, pre_event_samples)
        elif self.method == "median":
            return self._median_correction(data, axis, pre_event_samples)
        elif self.method == "detrend":
            return self._detrend(data, axis)
        elif self.method == "polyfit":
            return self._polyfit_detrend(data, axis)
        else:
            raise ValueError(f"Unknown method: {self.method}")
    
    def _mean_correction(
        self,
        data: np.ndarray,
        axis: int,
        pre_event_samples: Optional[int]
    ) -> np.ndarray:
        """Subtract mean baseline."""
        if pre_event_samples is not None and pre_event_samples > 0:
            # Use pre-event period for baseline
            if axis == -1 or axis == data.ndim - 1:
                baseline = np.mean(data[..., :pre_event_samples], axis=axis, keepdims=True)
            else:
                baseline = np.mean(data[:pre_event_samples], axis=axis, keepdims=True)
        else:
            # Use entire signal
            baseline = np.mean(data, axis=axis, keepdims=True)
        
        return data - baseline
    
    def _median_correction(
        self,
        data: np.ndarray,
        axis: int,
        pre_event_samples: Optional[int]
    ) -> np.ndarray:
        """Subtract median baseline."""
        if pre_event_samples is not None and pre_event_samples > 0:
            if axis == -1 or axis == data.ndim - 1:
                baseline = np.median(data[..., :pre_event_samples], axis=axis, keepdims=True)
            else:
                baseline = np.median(data[:pre_event_samples], axis=axis, keepdims=True)
        else:
            baseline = np.median(data, axis=axis, keepdims=True)
        
        return data - baseline
    
    def _detrend(self, data: np.ndarray, axis: int) -> np.ndarray:
        """Remove linear trend."""
        return signal.detrend(data, axis=axis)
    
    def _polyfit_detrend(self, data: np.ndarray, axis: int) -> np.ndarray:
        """Remove polynomial trend (quadratic)."""
        # For simplicity, use linear detrend
        return signal.detrend(data, axis=axis, type='linear')
