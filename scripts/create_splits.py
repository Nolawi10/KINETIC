#!/usr/bin/env python3
"""
Create train/validation/test splits for KINETIC dataset.

Usage:
    python scripts/create_splits.py --group_by participant_id --test_size 0.2 --val_size 0.2
"""

import argparse
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from kinetic.utils import load_config, setup_logger, get_logger
from kinetic.preprocessing import GroupAwareSplitter
from kinetic.sensors import SensorLoader


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Create group-aware train/validation/test splits"
    )
    parser.add_argument(
        "--data_dir",
        type=str,
        default="kinetic_data",
        help="Base directory for kinetic data"
    )
    parser.add_argument(
        "--group_by",
        type=str,
        default="participant_id",
        choices=["participant_id", "session_id"],
        help="Column to group by for splitting"
    )
    parser.add_argument(
        "--test_size",
        type=float,
        default=0.2,
        help="Proportion of data for test set"
    )
    parser.add_argument(
        "--val_size",
        type=float,
        default=0.2,
        help="Proportion of training data for validation set"
    )
    parser.add_argument(
        "--stratify_by",
        type=str,
        default="movement_class",
        help="Column to stratify by (e.g., movement_class)"
    )
    parser.add_argument(
        "--random_state",
        type=int,
        default=42,
        help="Random seed for reproducibility"
    )
    
    return parser.parse_args()


def main():
    """Main function."""
    args = parse_args()
    
    # Setup logger
    logger = setup_logger("kinetic", log_file="create_splits")
    logger.info(f"Creating splits with group_by={args.group_by}")
    
    # Load annotations
    loader = SensorLoader(args.data_dir)
    annotations_df = loader.load_annotations()
    
    logger.info(f"Loaded {len(annotations_df)} annotations")
    
    # Create splitter
    splitter = GroupAwareSplitter(
        group_by=args.group_by,
        test_size=args.test_size,
        val_size=args.val_size,
        random_state=args.random_state
    )
    
    # Split data
    logger.info("Splitting data...")
    train_df, val_df, test_df = splitter.split(annotations_df, stratify_by=args.stratify_by)
    
    # Print statistics
    stats = splitter.get_split_statistics(train_df, val_df, test_df)
    
    logger.info("=" * 60)
    logger.info("Split Statistics:")
    logger.info("=" * 60)
    for split_name, split_stats in stats.items():
        logger.info(f"{split_name}:")
        logger.info(f"  Events: {split_stats['n_events']}")
        logger.info(f"  Participants: {split_stats['n_participants']}")
        logger.info(f"  Sessions: {split_stats['n_sessions']}")
    logger.info("=" * 60)
    
    # Save splits
    output_dir = Path(args.data_dir) / "splits"
    splitter.save_splits(train_df, val_df, test_df, output_dir)
    
    logger.info(f"Splits saved to {output_dir}")


if __name__ == "__main__":
    main()
