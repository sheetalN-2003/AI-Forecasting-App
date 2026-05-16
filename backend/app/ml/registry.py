import logging
import time
from typing import Dict, Any

logger = logging.getLogger(__name__)

class MLFlowRegistry:
    """Mock MLFlow model registry for production MLOps"""
    
    def __init__(self):
        self.registry = {}

    def log_model(self, name: str, version: str, metrics: Dict[str, float], params: Dict[str, Any]):
        """Log a new model version with metrics and parameters"""
        logger.info(f"Logging model to registry: {name} v{version}")
        self.registry[f"{name}:{version}"] = {
            "metrics": metrics,
            "params": params,
            "timestamp": time.time(),
            "status": "Staging"
        }
        return f"run_id_{int(time.time())}"

    def transition_model_version(self, name: str, version: str, stage: str):
        """Transition a model to Production, Staging, or Archived"""
        key = f"{name}:{version}"
        if key in self.registry:
            self.registry[key]["status"] = stage
            logger.info(f"Model {key} transitioned to {stage}")
            return True
        return False

# Singleton instance
model_registry = MLFlowRegistry()
