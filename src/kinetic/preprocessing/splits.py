"""
Group-aware dataset splitting for KINETIC.

Implements participant- and session-based splitting to prevent data leakage.
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit, StratifiedGroupKFold
from pathlib import Path
from typing import Tuple, Optional


class GroupAwareSplitter:
    """
    Create train/validation/test splits with group awareness.
    
    Ensures that all data from a participant or session stays in the same split
    to prevent leakage and enable proper generalization evaluation.
    """
    
    def __init__(
        self,
        group_by: str = "participant_id",
        test_size: float = 0.2,
        val_size: float = 0.2,
        random_state: int = 42
    ):
        """
        Initialize the group-aware splitter.
        
        Args:
            group_by: Column to group by ("participant_id" or "session_id")
            test_size: Proportion of data for test set
            val_size: Proportion of training data for validation set
            random_state: Random seed for reproducibility
        """
        self.group_by = group_by
        self.test_size = test_size
        self.val_size = val_size
        self.random_state = random_state
    
    def split(
        self,
        annotations_df: pd.DataFrame,
        stratify_by: Optional[str] = None
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Split annotations into train/validation/test sets.
        
        Args:
            annotations_df: Annotations DataFrame with event annotations
            stratify_by: Column to stratify by (e.g., "movement_class")
            
        Returns:
            Tuple of (train_df, val_df, test_df)
        """
        # First split: separate test set
        if stratify_by:
            # Stratified group split for test
            splitter = GroupShuffleSplit(
                n_splits=1,
                test_size=self.test_size,
                random_state=self.random_state
            )
            
            # Get unique groups
            groups = annotations_df[self.group_by].values
            labels = annotations_df[stratify_by].values
            
            # Find indices for split
            train_val_idx, test_idx = next(splitter.split(
                annotations_df, labels, groups=groups
            ))
        else:
            # Simple group split for test
            splitter = GroupShuffleSplit(
                n_splits=1,
                test_size=self.test_size,
                random_state=self.random_state
            )
            
            groups = annotations_df[self.group_by].values
            train_val_idx, test_idx = next(splitter.split(
                annotations_df, groups=groups
            ))
        
        train_val_df = annotations_df.iloc[train_val_idx].reset_index(drop=True)
        test_df = annotations_df.iloc[test_idx].reset_index(drop=True)
        
        # Second split: separate validation from training
        if stratify_by:
            groups = train_val_df[self.group_by].values
            labels = train_val_df[stratify_by].values
            
            # Adjust val_size relative to remaining data
            adjusted_val_size = self.val_size / (1 - self.test_size)
            
            splitter = GroupShuffleSplit(
                n_splits=1,
                test_size=adjusted_val_size,
                random_state=self.random_state + 1
            )
            
            train_idx, val_idx = next(splitter.split(
                train_val_df, labels, groups=groups
            ))
        else:
            groups = train_val_df[self.group_by].values
            adjusted_val_size = self.val_size / (1 - self.test_size)
            
            splitter = GroupShuffleSplit(
                n_splits=1,
                test_size=adjusted_val_size,
                random_state=self.random_state + 1
            )
            
            train_idx, val_idx = next(splitter.split(
                train_val_df, groups=groups
            ))
        
        train_df = train_val_df.iloc[train_idx].reset_index(drop=True)
        val_df = train_val_df.iloc[val_idx].reset_index(drop=True)
        
        # Verify no group leakage
        self._verify_no_leakage(train_df, val_df, test_df)
        
        return train_df, val_df, test_df
    
    def _verify_no_leakage(
        self,
        train_df: pd.DataFrame,
        val_df: pd.DataFrame,
        test_df: pd.DataFrame
    ) -> None:
        """
        Verify that no groups appear in multiple splits.
        
        Args:
            train_df: Training set
            val_df: Validation set
            test_df: Test set
            
        Raises:
            AssertionError: If group leakage is detected
        """
        train_groups = set(train_df[self.group_by].unique())
        val_groups = set(val_df[self.group_by].unique())
        test_groups = set(test_df[self.group_by].unique())
        
        # Check for overlap
        train_val_overlap = train_groups & val_groups
        train_test_overlap = train_groups & test_groups
        val_test_overlap = val_groups & test_groups
        
        assert len(train_val_overlap) == 0, f"Group leakage between train and val: {train_val_overlap}"
        assert len(train_test_overlap) == 0, f"Group leakage between train and test: {train_test_overlap}"
        assert len(val_test_overlap) == 0, f"Group leakage between val and test: {val_test_overlap}"
    
    def save_splits(
        self,
        train_df: pd.DataFrame,
        val_df: pd.DataFrame,
        test_df: pd.DataFrame,
        output_dir: str
    ) -> None:
        """
        Save split files to CSV.
        
        Args:
            train_df: Training set
            val_df: Validation set
            test_df: Test set
            output_dir: Directory to save split files
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        train_df.to_csv(output_path / "train.csv", index=False)
        val_df.to_csv(output_path / "validation.csv", index=False)
        test_df.to_csv(output_path / "test.csv", index=False)
    
    def load_splits(self, input_dir: str) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Load split files from CSV.
        
        Args:
            input_dir: Directory containing split files
            
        Returns:
            Tuple of (train_df, val_df, test_df)
        """
        input_path = Path(input_dir)
        
        train_df = pd.read_csv(input_path / "train.csv")
        val_df = pd.read_csv(input_path / "validation.csv")
        test_df = pd.read_csv(input_path / "test.csv")
        
        return train_df, val_df, test_df
    
    def get_split_statistics(
        self,
        train_df: pd.DataFrame,
        val_df: pd.DataFrame,
        test_df: pd.DataFrame
    ) -> dict:
        """
        Get statistics about the splits.
        
        Args:
            train_df: Training set
            val_df: Validation set
            test_df: Test set
            
        Returns:
            Dictionary with split statistics
        """
        stats = {
            "train": {
                "n_events": len(train_df),
                "n_participants": train_df["participant_id"].nunique(),
                "n_sessions": train_df["session_id"].nunique()
            },
            "validation": {
                "n_events": len(val_df),
                "n_participants": val_df["participant_id"].nunique(),
                "n_sessions": val_df["session_id"].nunique()
            },
            "test": {
                "n_events": len(test_df),
                "n_participants": test_df["participant_id"].nunique(),
                "n_sessions": test_df["session_id"].nunique()
            }
        }
        
        return stats
