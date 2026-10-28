"""
Smoke test for KINETIC end-to-end pipeline.

Tests the complete pipeline from data generation to model training
on a small dataset.
"""

import pytest
import pandas as pd
import numpy as np
from pathlib import Path
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from kinetic.utils import set_seed, load_config
from kinetic.simulation import DataGenerator
from kinetic.preprocessing import GroupAwareSplitter
from kinetic.features import FeatureExtractor
from kinetic.models import ModelTrainer


def test_end_to_end_pipeline():
    """Test complete pipeline on small dataset."""
    # Load configurations
    sim_config = load_config("configs/simulation.yaml")
    features_config = load_config("configs/features.yaml")
    exp_config = load_config("configs/experiments.yaml")
    
    # Modify for small smoke test
    sim_config["simulation"]["use_preset"] = "small"
    sim_config["simulation"]["n_participants"] = 3
    sim_config["simulation"]["n_sessions_per_participant"] = 2
    sim_config["simulation"]["n_events_per_session"] = 5
    
    # Set seed
    set_seed(42)
    
    # Generate synthetic data
    print("Generating synthetic data...")
    generator = DataGenerator(sim_config, random_seed=42)
    paths = generator.generate_all()
    
    # Verify files created
    assert (Path(paths["participants"])).exists()
    assert (Path(paths["sessions"])).exists()
    assert (Path(paths["events"])).exists()
    
    # Create splits
    print("Creating splits...")
    splitter = GroupAwareSplitter(group_by="participant_id", test_size=0.3, val_size=0.3, random_state=42)
    
    from kinetic.sensors import SensorLoader
    loader = SensorLoader("kinetic_data")
    annotations_df = loader.load_annotations()
    
    train_df, val_df, test_df = splitter.split(annotations_df, stratify_by="movement_class")
    
    assert len(train_df) > 0
    assert len(val_df) > 0
    assert len(test_df) > 0
    
    # Extract features
    print("Extracting features...")
    feature_extractor = FeatureExtractor(features_config)
    
    # Extract for train only for smoke test
    train_features = feature_extractor.extract_batch_features(train_df, load_mat=False)
    
    assert len(train_features) > 0
    assert "piezo_max_amplitude" in train_features.columns or "imu_accel_mean_x" in train_features.columns
    
    # Train a simple model
    print("Training model...")
    trainer = ModelTrainer(exp_config)
    
    # Prepare data
    X_train, y_train, label_encoder, feature_names = trainer.prepare_data(train_features)
    
    assert X_train.shape[0] == len(y_train)
    assert len(label_encoder.classes_) > 0
    
    # Train Random Forest
    model, metadata = trainer.train_model("random_forest", X_train, y_train)
    
    assert model is not None
    assert metadata["training_time"] > 0
    
    print("Smoke test passed!")


if __name__ == "__main__":
    test_end_to_end_pipeline()
