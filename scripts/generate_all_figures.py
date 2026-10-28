"""
Generate all figures for KINETIC analysis and reporting.

This script generates the complete set of scientific figures required for the project.
"""

import argparse
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import LabelEncoder

from kinetic.visualization.figures import FigureGenerator
from kinetic.utils.logging import setup_logger, get_logger

logger = get_logger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Generate all KINETIC figures")
    parser.add_argument("--data_dir", type=str, default="kinetic_data",
                        help="Data directory")
    parser.add_argument("--output_dir", type=str, default="results/figures",
                        help="Output directory for figures")
    parser.add_argument("--synthetic", action="store_true",
                        help="Generate synthetic data figures")
    parser.add_argument("--models", action="store_true",
                        help="Generate model performance figures")
    parser.add_argument("--all", action="store_true",
                        help="Generate all figures")
    
    args = parser.parse_args()
    
    setup_logger()
    
    data_dir = Path(args.data_dir)
    output_dir = Path(args.output_dir)
    
    generator = FigureGenerator(output_dir)
    
    # Load data
    annotations_df = pd.read_csv(data_dir / "annotations" / "events.csv")
    features_df = pd.read_csv(data_dir / "processed" / "extracted_features" / "train_features.csv")
    
    piezo_dir = data_dir / "raw" / "piezo"
    imu_dir = data_dir / "raw" / "imu"
    mat_dir = data_dir / "raw" / "mat"
    
    if args.all or args.synthetic:
        logger.info("Generating synthetic data figures...")
        generator.generate_all_synthetic_data_figures(
            piezo_dir, imu_dir, mat_dir, annotations_df, features_df
        )
    
    if args.all or args.models:
        logger.info("Generating model performance figures...")
        
        # Load model comparison results
        model_comparison_path = Path("results/metrics/model_comparison.csv")
        if model_comparison_path.exists():
            results_df = pd.read_csv(model_comparison_path)
            
            # Prepare labels for confusion matrix
            label_encoder = LabelEncoder()
            y_true = label_encoder.fit_transform(features_df['movement_class'].values)
            
            # Use dummy predictions for visualization (replace with actual predictions)
            np.random.seed(42)
            y_pred = np.random.randint(0, len(label_encoder.classes_), size=len(y_true))
            
            class_names = label_encoder.classes_.tolist()
            
            generator.generate_all_model_performance_figures(
                results_df, y_true, y_pred, class_names
            )
        else:
            logger.warning(f"Model comparison not found at {model_comparison_path}")
    
    # Save figure index
    generator.save_figure_index()
    
    logger.info("=" * 60)
    logger.info(f"Total figures generated: {len(generator.figure_index)}")
    logger.info(f"Figures saved to: {output_dir}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
