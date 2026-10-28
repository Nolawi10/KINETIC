#!/usr/bin/env python3
"""
Extract features from KINETIC sensor data.

Usage:
    python scripts/extract_features.py --config configs/features.yaml --split train
    python scripts/extract_features.py --config configs/features.yaml --split all
"""

import argparse
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from kinetic.utils import load_config, setup_logger, get_logger
from kinetic.features import FeatureExtractor
from kinetic.preprocessing import GroupAwareSplitter
from kinetic.sensors import SensorLoader


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Extract features from sensor data"
    )
    parser.add_argument(
        "--config",
        type=str,
        default="configs/features.yaml",
        help="Path to features configuration file"
    )
    parser.add_argument(
        "--data_dir",
        type=str,
        default="kinetic_data",
        help="Base directory for kinetic data"
    )
    parser.add_argument(
        "--split",
        type=str,
        default="all",
        choices=["train", "validation", "test", "all"],
        help="Which split to extract features for"
    )
    parser.add_argument(
        "--load_piezo",
        action="store_true",
        default=True,
        help="Load and extract piezo features"
    )
    parser.add_argument(
        "--load_imu",
        action="store_true",
        default=True,
        help="Load and extract IMU features"
    )
    parser.add_argument(
        "--load_mat",
        action="store_true",
        default=True,
        help="Load and extract mat features"
    )
    
    return parser.parse_args()


def main():
    """Main function."""
    args = parse_args()
    
    # Load configuration
    config = load_config(args.config)
    
    # Setup logger
    logger = setup_logger("kinetic", log_file="extract_features")
    logger.info(f"Configuration loaded from {args.config}")
    
    # Load splits
    loader = SensorLoader(args.data_dir)
    splitter = GroupAwareSplitter()
    
    try:
        train_df, val_df, test_df = splitter.load_splits(Path(args.data_dir) / "splits")
        logger.info("Loaded existing splits")
    except FileNotFoundError:
        logger.error("No splits found. Run create_splits.py first.")
        return
    
    # Determine which splits to process
    splits_to_process = []
    if args.split == "all":
        splits_to_process = [("train", train_df), ("validation", val_df), ("test", test_df)]
    elif args.split == "train":
        splits_to_process = [("train", train_df)]
    elif args.split == "validation":
        splits_to_process = [("validation", val_df)]
    elif args.split == "test":
        splits_to_process = [("test", test_df)]
    
    # Initialize feature extractor
    feature_extractor = FeatureExtractor(config)
    
    # Extract features for each split
    for split_name, split_df in splits_to_process:
        logger.info(f"Extracting features for {split_name} split ({len(split_df)} events)...")
        
        features_df = feature_extractor.extract_batch_features(
            split_df,
            load_piezo=args.load_piezo,
            load_imu=args.load_imu,
            load_mat=args.load_mat
        )
        
        # Save features
        output_path = Path(args.data_dir) / "processed" / "extracted_features" / f"{split_name}_features.csv"
        feature_extractor.save_features(features_df, output_path)
        
        logger.info(f"Features saved to {output_path}")
        logger.info(f"  Shape: {features_df.shape}")
        logger.info(f"  Columns: {list(features_df.columns)}")
    
    logger.info("Feature extraction complete")


if __name__ == "__main__":
    main()
