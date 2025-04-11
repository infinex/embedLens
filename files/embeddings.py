from abc import ABC, abstractmethod
import numpy as np
from typing import List, Union
import openai
import torch
from transformers import AutoTokenizer, AutoModel
import os

class EmbeddingModel(ABC):
    @abstractmethod
    async def generate(self, texts: List[str]) -> np.ndarray:
        pass

class OpenAIEmbedding(EmbeddingModel):
    def __init__(self, model_name: str = "text-embedding-ada-002"):
        self.model_name = model_name
        openai.api_key = os.getenv("OPENAI_API_KEY")

    async def generate(self, texts: List[str]) -> np.ndarray:
        try:
            response = await openai.Embedding.acreate(
                model=self.model_name,
                input=texts
            )
            return np.array([r["embedding"] for r in response["data"]])
        except Exception as e:
            raise ValueError(f"OpenAI API error: {str(e)}")

class HuggingFaceEmbedding(EmbeddingModel):
    def __init__(self, model_name: str = "sentence-transformers/all-mpnet-base-v2"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name).to(self.device)

    async def generate(self, texts: List[str]) -> np.ndarray:
        try:
            # Tokenize and compute mean pooling
            inputs = self.tokenizer(
                texts,
                padding=True,
                truncation=True,
                return_tensors="pt"
            ).to(self.device)
            
            with torch.no_grad():
                outputs = self.model(**inputs)
                # Use mean pooling of last hidden state
                embeddings = torch.mean(outputs.last_hidden_state, dim=1)
                
            return embeddings.cpu().numpy()
        except Exception as e:
            raise ValueError(f"HuggingFace model error: {str(e)}")

def get_embedding_model(model_name: str) -> EmbeddingModel:
    return HuggingFaceEmbedding()