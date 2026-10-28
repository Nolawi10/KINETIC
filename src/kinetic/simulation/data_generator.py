"""
Main data generator for synthetic KINETIC dataset.

Orchestrates piezo, IMU, and mat simulators to generate synchronized
multi-modal synthetic data with metadata and annotations.
"""

import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Optional
from tqdm import tqdm

from .piezo_simulator import PiezoSimulator
from .imu_simulator import IMUSimulator
from .mat_simulator import MatSimulator
from .metadata_generator import MetadataGenerator
from .annotation_generator import AnnotationGenerator
from ..utils import set_seed, get_logger


class DataGenerator:
    """
    Main synthetic data generator for KINETIC.
    
    Orchestrates all simulators to generate a complete synthetic dataset
    with synchronized piezo, IMU, and mat data, plus metadata and annotations.
    """
    
    def __init__(self, config: Dict, random_seed: int = 42):
        """
        Initialize the data generator.
        
        Args:
            config: Configuration dictionary from simulation.yaml
            random_seed: Random seed for reproducibility
        """
        self.config = config
        self.random_seed = random_seed
        
        # Set random seed
        set_seed(random_seed)
        
        # Initialize logger
        self.logger = get_logger("kinetic")
        
        # Initialize simulators
        self.piezo_simulator = PiezoSimulator(config)
        self.imu_simulator = IMUSimulator(config)
        self.mat_simulator = MatSimulator(config)
        
        # Initialize metadata and annotation generators
        self.metadata_generator = MetadataGenerator(config)
        self.annotation_generator = AnnotationGenerator(config)
        
        # Output configuration
        self.output_config = config.get("output", {})
        self.base_dir = Path(self.output_config.get("base_dir", "kinetic_data"))
        
        # Get dataset size
        self._determine_dataset_size()
    
    def _determine_dataset_size(self) -> None:
        """Determine dataset size from configuration."""
        sim_config = self.config.get("simulation", {})
        use_preset = sim_config.get("use_preset")
        
        if use_preset:
            presets = sim_config.get("presets", {})
            preset = presets.get(use_preset, presets.get("small", {}))
            self.n_participants = preset.get("n_participants", 5)
            self.n_sessions_per_participant = preset.get("n_sessions_per_participant", 2)
            self.n_events_per_session = preset.get("n_events_per_session", 20)
        else:
            self.n_participants = sim_config.get("n_participants", 5)
            self.n_sessions_per_participant = sim_config.get("n_sessions_per_participant", 2)
            self.n_events_per_session = sim_config.get("n_events_per_session", 20)
        
        self.n_total_events = (
            self.n_participants * 
            self.n_sessions_per_participant * 
            self.n_events_per_session
        )
        
        self.logger.info(
            f"Dataset size: {self.n_participants} participants, "
            f"{self.n_sessions_per_participant} sessions/participant, "
            f"{self.n_events_per_session} events/session = {self.n_total_events} total events"
        )
    
    def generate_metadata(self, rng: np.random.Generator) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Generate all metadata tables.
        
        Args:
            rng: Random number generator
            
        Returns:
            Tuple of (participants_df, sessions_df, label_definitions_df)
        """
        self.logger.info("Generating metadata tables...")
        
        # Generate participants
        participants_df = self.metadata_generator.generate_participants(
            self.n_participants, rng
        )
        
        # Generate sessions
        sessions_df = self.metadata_generator.generate_sessions(
            participants_df,
            self.n_sessions_per_participant,
            self.random_seed,
            rng
        )
        
        # Generate label definitions
        label_definitions_df = self.metadata_generator.generate_label_definitions()
        
        self.logger.info(
            f"Generated {len(participants_df)} participants, "
            f"{len(sessions_df)} sessions, "
            f"{len(label_definitions_df)} label definitions"
        )
        
        return participants_df, sessions_df, label_definitions_df
    
    def generate_annotations(
        self,
        sessions_df: pd.DataFrame,
        rng: np.random.Generator
    ) -> pd.DataFrame:
        """
        Generate event annotations.
        
        Args:
            sessions_df: Sessions DataFrame
            rng: Random number generator
            
        Returns:
            Annotations DataFrame
        """
        self.logger.info("Generating event annotations...")
        
        annotations_df = self.annotation_generator.generate_event_annotations(
            sessions_df,
            self.n_events_per_session,
            self.random_seed,
            rng
        )
        
        self.logger.info(f"Generated {len(annotations_df)} event annotations")
        
        return annotations_df
    
    def save_waveform(
        self,
        waveforms: np.ndarray,
        timestamps: np.ndarray,
        event_id: str,
        output_dir: Path
    ) -> None:
        """
        Save piezo waveform to file.
        
        Args:
            waveforms: (n_channels, n_samples) array
            timestamps: (n_samples,) array
            event_id: Event identifier
            output_dir: Output directory
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        
        format_type = self.output_config.get("waveform_format", "npz")
        filepath = output_dir / f"{event_id}.{format_type}"
        
        if format_type == "npz":
            np.savez_compressed(
                filepath,
                waveforms=waveforms,
                timestamps=timestamps,
                event_id=event_id
            )
        elif format_type == "csv":
            # Save as CSV for inspection
            import pandas as pd
            df = pd.DataFrame(timestamps, columns=["timestamp"])
            for i in range(waveforms.shape[0]):
                df[f"channel_{i}"] = waveforms[i]
            df.to_csv(filepath, index=False)
    
    def save_imu(
        self,
        imu_data: np.ndarray,
        timestamps: np.ndarray,
        event_id: str,
        output_dir: Path
    ) -> None:
        """
        Save IMU data to file.
        
        Args:
            imu_data: (n_samples, 6) array [accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z]
            timestamps: (n_samples,) array
            event_id: Event identifier
            output_dir: Output directory
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        
        format_type = self.output_config.get("imu_format", "npz")
        filepath = output_dir / f"{event_id}.{format_type}"
        
        if format_type == "npz":
            np.savez_compressed(
                filepath,
                imu_data=imu_data,
                timestamps=timestamps,
                event_id=event_id
            )
        elif format_type == "csv":
            import pandas as pd
            df = pd.DataFrame(imu_data, columns=[
                "accel_x", "accel_y", "accel_z",
                "gyro_x", "gyro_y", "gyro_z"
            ])
            df["timestamp"] = timestamps
            df.to_csv(filepath, index=False)
    
    def save_mat(
        self,
        zone_events: list,
        timestamps: np.ndarray,
        event_id: str,
        output_dir: Path
    ) -> None:
        """
        Save mat zone events to file.
        
        Args:
            zone_events: List of zone event dictionaries
            timestamps: Array of sample timestamps
            event_id: Event identifier
            output_dir: Output directory
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        
        format_type = self.output_config.get("mat_format", "csv")
        filepath = output_dir / f"{event_id}.{format_type}"
        
        if format_type == "csv":
            import pandas as pd
            df = pd.DataFrame(zone_events)
            df.to_csv(filepath, index=False)
    
    def generate_sensor_data(
        self,
        annotations_df: pd.DataFrame,
        rng: np.random.Generator
    ) -> None:
        """
        Generate and save all sensor data.
        
        Args:
            annotations_df: Annotations DataFrame
            rng: Random number generator
        """
        self.logger.info("Generating sensor data...")
        
        # Output directories
        raw_dir = self.base_dir / self.output_config.get("raw_subdir", "raw")
        piezo_dir = raw_dir / "piezo"
        imu_dir = raw_dir / "imu"
        mat_dir = raw_dir / "mat"
        
        # Prepare event lists for batch generation
        piezo_events = []
        imu_events = []
        mat_events = []
        
        for _, row in annotations_df.iterrows():
            piezo_events.append({
                "event_id": row["event_id"],
                "target_zone": row["target_zone"]
            })
            imu_events.append({
                "event_id": row["event_id"],
                "movement_class": row["movement_class"]
            })
            mat_events.append({
                "event_id": row["event_id"],
                "movement_class": row["movement_class"]
            })
        
        # Generate piezo data
        self.logger.info("Generating piezo waveforms...")
        piezo_results = self.piezo_simulator.generate_batch(piezo_events, rng)
        
        for (waveforms, t, metadata) in tqdm(piezo_results, desc="Saving piezo data"):
            event_id = metadata["event_id"]
            self.save_waveform(waveforms, t, event_id, piezo_dir)
        
        # Generate IMU data
        self.logger.info("Generating IMU data...")
        imu_results = self.imu_simulator.generate_batch(imu_events, rng)
        
        for (imu_data, t, metadata) in tqdm(imu_results, desc="Saving IMU data"):
            event_id = metadata["event_id"]
            self.save_imu(imu_data, t, event_id, imu_dir)
        
        # Generate mat data
        self.logger.info("Generating mat data...")
        mat_results = self.mat_simulator.generate_batch(mat_events, rng)
        
        for (zone_events, t, metadata) in tqdm(mat_results, desc="Saving mat data"):
            event_id = metadata["event_id"]
            self.save_mat(zone_events, t, event_id, mat_dir)
        
        self.logger.info("Sensor data generation complete")
    
    def generate_all(self) -> Dict[str, Path]:
        """
        Generate complete synthetic dataset.
        
        Returns:
            Dictionary with paths to generated files
        """
        self.logger.info(f"Starting synthetic data generation with seed {self.random_seed}")
        
        # Initialize random generator
        rng = np.random.default_rng(self.random_seed)
        
        # Generate metadata
        participants_df, sessions_df, label_definitions_df = self.generate_metadata(rng)
        
        # Generate annotations
        annotations_df = self.generate_annotations(sessions_df, rng)
        
        # Save metadata and annotations
        metadata_dir = self.base_dir / self.output_config.get("metadata_subdir", "metadata")
        annotations_dir = self.base_dir / self.output_config.get("annotations_subdir", "annotations")
        
        self.metadata_generator.save_metadata(
            participants_df, sessions_df, label_definitions_df, metadata_dir
        )
        self.annotation_generator.save_annotations(annotations_df, annotations_dir)
        
        # Generate sensor data
        self.generate_sensor_data(annotations_df, rng)
        
        self.logger.info("Synthetic dataset generation complete")
        
        return {
            "participants": metadata_dir / "participants.csv",
            "sessions": metadata_dir / "sessions.csv",
            "label_definitions": metadata_dir / "label_definitions.csv",
            "events": annotations_dir / "events.csv",
            "piezo_dir": self.base_dir / self.output_config.get("raw_subdir", "raw") / "piezo",
            "imu_dir": self.base_dir / self.output_config.get("raw_subdir", "raw") / "imu",
            "mat_dir": self.base_dir / self.output_config.get("raw_subdir", "raw") / "mat",
        }
