#!/usr/bin/env python3
"""
Train and evaluate models for KINETIC.

Usage:
    python scripts/train_models.py --config configs/experiments.yaml --baseline
    python scripts/train_models.py --config configs/experiments.yaml --models random_forest xgboost
"""

import argparse
import sys
from pathlib import Path
import pandas as pd

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from kinetic.utils import load_config, setup_logger, get_logger
from kinetic.models import ModelTrainer


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Train and evaluate models"
    )
    parser.add_argument(
        "--config",
        type=str,
        default="configs/experiments.yaml",
        help="Path to experiments configuration file"
    )
    parser.add_argument(
        "--data_dir",
        type=str,
        default="kinetic_data",
        help="Base directory for kinetic data"
    )
    parser.add_argument(
        "--target",
        type=str,
        default="movement_class",
        choices=["movement_class", "target_zone"],
        help="Target variable to predict"
    )
    parser.add_argument(
        "--baseline",
        action="store_true",
        help="Train only baseline models (dummy, logistic_regression, random_forest)"
    )
    parser.add_argument(
        "--models",
        nargs="+",
        help="Specific models to train"
    )
    
    return parser.parse_args()


def main():
    """Main function."""
    args = parse_args()
    
    # Load configuration
    config = load_config(args.config)
    
    # Setup logger
    logger = setup_logger("kinetic", log_file="train_models")
    logger.info(f"Configuration loaded from {args.config}")
    
    # Load feature data
    train_path = Path(args.data_dir) / "processed" / "extracted_features" / "train_features.csv"
    val_path = Path(args.data_dir) / "processed" / "extracted_features" / "validation_features.csv"
    test_path = Path(args.data_dir) / "processed" / "extracted_features" / "test_features.csv"
    
    logger.info(f"Loading features from {train_path}")
    train_df = pd.read_csv(train_path)
    val_df = pd.read_csv(val_path)
    test_df = pd.read_csv(test_path)
    
    logger.info(f"Train: {len(train_df)} events")
    logger.info(f"Validation: {len(val_df)} events")
    logger.info(f"Test: {len(test_df)} events")
    
    # Determine which models to train
    if args.baseline:
        model_names = ["dummy", "logistic_regression", "random_forest"]
    elif args.models:
        model_names = args.models
    else:
        model_names = None  # Train all enabled models
    
    # Initialize trainer
    trainer = ModelTrainer(config)
    
    # Train and evaluate models
    logger.info("Starting model training and evaluation...")
    results_df = trainer.train_and_evaluate_models(
        train_df,
        val_df,
        test_df,
        target_column=args.target,
        model_names=model_names
    )
    
    # Print summary
    logger.info("\n" + "=" * 60)
    logger.info("Model Comparison Summary")
    logger.info("=" * 60)
    
    # Sort by macro F1
    if "macro_f1" in results_df.columns:
        results_sorted = results_df.sort_values("macro_f1", ascending=False)
        for _, row in results_sorted.iterrows():
            logger.info(f"{row['model_name']}:")
            logger.info(f"  Macro F1: {row.get('macro_f1', 'N/A'):.4f}")
            logger.info(f"  Balanced Accuracy: {row.get('balanced_accuracy', 'N/A'):.4f}")
            logger.info(f"  Training Time: {row.get('training_time', 'N/A'):.2f}s")
    else:
        logger.info(results_df.to_string())
    
    logger.info("=" * 60)
    logger.info("Training complete")


if __name__ == "__main__":
    main()
