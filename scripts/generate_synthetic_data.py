#!/usr/bin/env python3
"""
Generate synthetic KINETIC dataset.

Usage:
    python scripts/generate_synthetic_data.py --config configs/simulation.yaml --size small
    python scripts/generate_synthetic_data.py --config configs/simulation.yaml --n_participants 10 --n_sessions 3 --n_events 50
"""

import argparse
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from kinetic.utils import load_config, set_seed, setup_logger, get_logger
from kinetic.simulation import DataGenerator


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Generate synthetic KINETIC dataset"
    )
    parser.add_argument(
        "--config",
        type=str,
        default="configs/simulation.yaml",
        help="Path to simulation configuration file"
    )
    parser.add_argument(
        "--size",
        type=str,
        choices=["small", "medium", "large"],
        default=None,
        help="Dataset size preset (overrides config)"
    )
    parser.add_argument(
        "--n_participants",
        type=int,
        default=None,
        help="Number of participants (overrides config)"
    )
    parser.add_argument(
        "--n_sessions",
        type=int,
        default=None,
        help="Number of sessions per participant (overrides config)"
    )
    parser.add_argument(
        "--n_events",
        type=int,
        default=None,
        help="Number of events per session (overrides config)"
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed (overrides config)"
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default=None,
        help="Output directory (overrides config)"
    )
    
    return parser.parse_args()


def main():
    """Main function."""
    args = parse_args()
    
    # Load configuration
    config = load_config(args.config)
    
    # Override config with command line arguments
    if args.size:
        config["simulation"]["use_preset"] = args.size
    if args.n_participants:
        config["simulation"]["n_participants"] = args.n_participants
    if args.n_sessions:
        config["simulation"]["n_sessions_per_participant"] = args.n_sessions
    if args.n_events:
        config["simulation"]["n_events_per_session"] = args.n_events
    if args.seed:
        config["random_seed"] = args.seed
    if args.output_dir:
        config["output"]["base_dir"] = args.output_dir
    
    # Set random seed
    random_seed = config.get("random_seed", 42)
    set_seed(random_seed)
    
    # Setup logger
    logger = setup_logger("kinetic", log_file="data_generation")
    logger.info(f"Configuration loaded from {args.config}")
    logger.info(f"Random seed: {random_seed}")
    
    # Generate data
    generator = DataGenerator(config, random_seed)
    paths = generator.generate_all()
    
    # Print summary
    logger.info("=" * 60)
    logger.info("Synthetic dataset generation complete!")
    logger.info("=" * 60)
    for name, path in paths.items():
        logger.info(f"{name}: {path}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
