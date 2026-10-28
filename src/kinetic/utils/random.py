"""Random seed management for reproducibility."""

import random
import numpy as np
import torch
from typing import Optional

# Global seed state
_global_seed: Optional[int] = None


def set_seed(seed: int) -> None:
    """
    Set random seeds for all random number generators.
    
    Args:
        seed: Random seed to use
    """
    global _global_seed
    _global_seed = seed
    
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    
    # Ensure deterministic behavior in PyTorch (may impact performance)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


def get_seed() -> Optional[int]:
    """
    Get the current global random seed.
    
    Returns:
        Current seed if set, None otherwise
    """
    return _global_seed


def check_reproducibility() -> bool:
    """
    Check if reproducibility settings are properly configured.
    
    Returns:
        True if seeds are set and deterministic mode is enabled
    """
    if _global_seed is None:
        return False
    
    # Check PyTorch settings
    if not torch.backends.cudnn.deterministic:
        return False
    
    return True
