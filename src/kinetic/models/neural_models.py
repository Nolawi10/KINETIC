"""
Neural network models for KINETIC.

Implements:
- 1D-CNN for raw sensor windows
- MLP (Multi-Layer Perceptron) for engineered features
"""

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, f1_score, balanced_accuracy_score
from typing import Dict, List, Tuple, Optional
import joblib
import time
from pathlib import Path

from ..utils.logging import get_logger

logger = get_logger(__name__)


class SensorWindowDataset(Dataset):
    """PyTorch Dataset for raw sensor windows."""
    
    def __init__(self, X: np.ndarray, y: np.ndarray, is_2d: bool = False):
        """
        Args:
            X: Raw sensor windows (n_samples, n_channels, n_timesteps) or (n_samples, n_features)
            y: Labels (n_samples,)
            is_2d: If True, X is 2D (for MLP), if False, X is 3D (for CNN)
        """
        self.X = torch.FloatTensor(X)
        self.y = torch.LongTensor(y)
        self.is_2d = is_2d
        
    def __len__(self):
        return len(self.y)
    
    def __getitem__(self, idx):
        if self.is_2d:
            return self.X[idx], self.y[idx]
        else:
            return self.X[idx], self.y[idx]


class Sensor1DCNN(nn.Module):
    """1D Convolutional Neural Network for raw sensor windows."""
    
    def __init__(
        self,
        n_channels: int,
        n_timesteps: int,
        n_classes: int,
        conv_channels: List[int] = [32, 64, 128],
        kernel_sizes: List[int] = [5, 5, 3],
        dropout: float = 0.3
    ):
        """
        Args:
            n_channels: Number of sensor channels
            n_timesteps: Number of time steps per window
            n_classes: Number of output classes
            conv_channels: Number of filters in each conv layer
            kernel_sizes: Kernel size for each conv layer
            dropout: Dropout rate
        """
        super(Sensor1DCNN, self).__init__()
        
        self.n_channels = n_channels
        self.n_timesteps = n_timesteps
        self.n_classes = n_classes
        
        # Build convolutional layers
        conv_layers = []
        in_channels = n_channels
        
        for i, (out_channels, kernel_size) in enumerate(zip(conv_channels, kernel_sizes)):
            conv_layers.extend([
                nn.Conv1d(in_channels, out_channels, kernel_size, padding=kernel_size//2),
                nn.BatchNorm1d(out_channels),
                nn.ReLU(),
                nn.MaxPool1d(2),
                nn.Dropout(dropout)
            ])
            in_channels = out_channels
        
        self.conv = nn.Sequential(*conv_layers)
        
        # Calculate flattened size
        with torch.no_grad():
            dummy_input = torch.zeros(1, n_channels, n_timesteps)
            conv_output = self.conv(dummy_input)
            self.flatten_size = conv_output.view(1, -1).shape[1]
        
        # Fully connected layers
        self.fc = nn.Sequential(
            nn.Linear(self.flatten_size, 256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, n_classes)
        )
        
    def forward(self, x):
        x = self.conv(x)
        x = x.view(x.size(0), -1)
        x = self.fc(x)
        return x


class FeatureMLP(nn.Module):
    """Multi-Layer Perceptron for engineered features."""
    
    def __init__(
        self,
        n_features: int,
        n_classes: int,
        hidden_layers: List[int] = [128, 64],
        dropout: float = 0.3
    ):
        """
        Args:
            n_features: Number of input features
            n_classes: Number of output classes
            hidden_layers: Sizes of hidden layers
            dropout: Dropout rate
        """
        super(FeatureMLP, self).__init__()
        
        self.n_features = n_features
        self.n_classes = n_classes
        
        # Build hidden layers
        layers = []
        in_size = n_features
        
        for hidden_size in hidden_layers:
            layers.extend([
                nn.Linear(in_size, hidden_size),
                nn.BatchNorm1d(hidden_size),
                nn.ReLU(),
                nn.Dropout(dropout)
            ])
            in_size = hidden_size
        
        self.hidden = nn.Sequential(*layers)
        self.output = nn.Linear(in_size, n_classes)
        
    def forward(self, x):
        # x shape: (batch, features) for MLP
        x = self.hidden(x)
        x = self.output(x)
        return x


class NeuralModelTrainer:
    """Trainer for neural network models."""
    
    def __init__(
        self,
        model: nn.Module,
        device: str = 'cpu',
        learning_rate: float = 0.001,
        weight_decay: float = 1e-4,
        patience: int = 10
    ):
        """
        Args:
            model: PyTorch model
            device: 'cpu' or 'cuda'
            learning_rate: Learning rate for optimizer
            weight_decay: L2 regularization
            patience: Early stopping patience
        """
        self.model = model.to(device)
        self.device = device
        self.criterion = nn.CrossEntropyLoss()
        self.optimizer = optim.Adam(
            model.parameters(),
            lr=learning_rate,
            weight_decay=weight_decay
        )
        self.patience = patience
        self.best_val_loss = float('inf')
        self.epochs_no_improve = 0
        
    def train_epoch(self, train_loader: DataLoader) -> float:
        """Train for one epoch."""
        self.model.train()
        total_loss = 0.0
        
        for X_batch, y_batch in train_loader:
            X_batch, y_batch = X_batch.to(self.device), y_batch.to(self.device)
            
            self.optimizer.zero_grad()
            outputs = self.model(X_batch)
            loss = self.criterion(outputs, y_batch)
            loss.backward()
            self.optimizer.step()
            
            total_loss += loss.item()
        
        return total_loss / len(train_loader)
    
    def validate(self, val_loader: DataLoader) -> Tuple[float, float]:
        """Validate model."""
        self.model.eval()
        total_loss = 0.0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for X_batch, y_batch in val_loader:
                X_batch, y_batch = X_batch.to(self.device), y_batch.to(self.device)
                
                outputs = self.model(X_batch)
                loss = self.criterion(outputs, y_batch)
                total_loss += loss.item()
                
                _, predicted = torch.max(outputs.data, 1)
                total += y_batch.size(0)
                correct += (predicted == y_batch).sum().item()
        
        avg_loss = total_loss / len(val_loader)
        accuracy = correct / total
        
        return avg_loss, accuracy
    
    def fit(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        max_epochs: int = 100,
        verbose: bool = True
    ) -> Dict:
        """
        Train model with early stopping.
        
        Returns:
            Training history dictionary
        """
        history = {
            'train_loss': [],
            'val_loss': [],
            'val_accuracy': []
        }
        
        for epoch in range(max_epochs):
            train_loss = self.train_epoch(train_loader)
            val_loss, val_accuracy = self.validate(val_loader)
            
            history['train_loss'].append(train_loss)
            history['val_loss'].append(val_loss)
            history['val_accuracy'].append(val_accuracy)
            
            if verbose and epoch % 5 == 0:
                logger.info(
                    f"Epoch {epoch}: Train Loss={train_loss:.4f}, "
                    f"Val Loss={val_loss:.4f}, Val Acc={val_accuracy:.4f}"
                )
            
            # Early stopping
            if val_loss < self.best_val_loss:
                self.best_val_loss = val_loss
                self.epochs_no_improve = 0
                # Save best model
                best_model_state = self.model.state_dict().copy()
            else:
                self.epochs_no_improve += 1
                if self.epochs_no_improve >= self.patience:
                    if verbose:
                        logger.info(f"Early stopping at epoch {epoch}")
                    break
        
        # Load best model
        self.model.load_state_dict(best_model_state)
        
        return history
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions."""
        self.model.eval()
        X_tensor = torch.FloatTensor(X).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(X_tensor)
            _, predicted = torch.max(outputs, 1)
        
        return predicted.cpu().numpy()
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Get probability predictions."""
        self.model.eval()
        X_tensor = torch.FloatTensor(X).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(X_tensor)
            probs = torch.softmax(outputs, dim=1)
        
        return probs.cpu().numpy()


def train_1d_cnn(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    n_classes: int,
    config: Optional[Dict] = None,
    random_state: int = 42
) -> Tuple[nn.Module, Dict]:
    """
    Train 1D-CNN on raw sensor windows.
    
    Args:
        X_train: Training data (n_samples, n_channels, n_timesteps)
        y_train: Training labels
        X_val: Validation data
        y_val: Validation labels
        n_classes: Number of classes
        config: Model configuration dict
        random_state: Random seed
        
    Returns:
        Trained model and training history
    """
    if config is None:
        config = {
            'conv_channels': [32, 64, 128],
            'kernel_sizes': [5, 5, 3],
            'dropout': 0.3,
            'learning_rate': 0.001,
            'batch_size': 32,
            'max_epochs': 100,
            'patience': 10
        }
    
    torch.manual_seed(random_state)
    np.random.seed(random_state)
    
    n_channels, n_timesteps = X_train.shape[1], X_train.shape[2]
    
    # Create model
    model = Sensor1DCNN(
        n_channels=n_channels,
        n_timesteps=n_timesteps,
        n_classes=n_classes,
        conv_channels=config['conv_channels'],
        kernel_sizes=config['kernel_sizes'],
        dropout=config['dropout']
    )
    
    # Create datasets
    train_dataset = SensorWindowDataset(X_train, y_train)
    val_dataset = SensorWindowDataset(X_val, y_val)
    
    train_loader = DataLoader(
        train_dataset,
        batch_size=config['batch_size'],
        shuffle=True
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=config['batch_size'],
        shuffle=False
    )
    
    # Train
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    logger.info(f"Training 1D-CNN on {device}")
    
    trainer = NeuralModelTrainer(
        model,
        device=device,
        learning_rate=config['learning_rate'],
        patience=config['patience']
    )
    
    history = trainer.fit(
        train_loader,
        val_loader,
        max_epochs=config['max_epochs'],
        verbose=True
    )
    
    return model, history


def train_mlp(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    n_classes: int,
    config: Optional[Dict] = None,
    random_state: int = 42
) -> Tuple[nn.Module, Dict]:
    """
    Train MLP on engineered features.
    
    Args:
        X_train: Training features (n_samples, n_features)
        y_train: Training labels
        X_val: Validation features
        y_val: Validation labels
        n_classes: Number of classes
        config: Model configuration dict
        random_state: Random seed
        
    Returns:
        Trained model and training history
    """
    if config is None:
        config = {
            'hidden_layers': [128, 64],
            'dropout': 0.3,
            'learning_rate': 0.001,
            'batch_size': 32,
            'max_epochs': 100,
            'patience': 10
        }
    
    torch.manual_seed(random_state)
    np.random.seed(random_state)
    
    n_features = X_train.shape[1]
    
    # Create model
    model = FeatureMLP(
        n_features=n_features,
        n_classes=n_classes,
        hidden_layers=config['hidden_layers'],
        dropout=config['dropout']
    )
    
    # Create datasets
    train_dataset = SensorWindowDataset(X_train, y_train, is_2d=True)
    val_dataset = SensorWindowDataset(X_val, y_val, is_2d=True)
    
    train_loader = DataLoader(
        train_dataset,
        batch_size=config['batch_size'],
        shuffle=True
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=config['batch_size'],
        shuffle=False
    )
    
    # Train
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    logger.info(f"Training MLP on {device}")
    
    trainer = NeuralModelTrainer(
        model,
        device=device,
        learning_rate=config['learning_rate'],
        patience=config['patience']
    )
    
    history = trainer.fit(
        train_loader,
        val_loader,
        max_epochs=config['max_epochs'],
        verbose=True
    )
    
    return model, history
