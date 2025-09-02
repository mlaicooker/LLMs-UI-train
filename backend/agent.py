import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import torch
import librosa
import json
import uvicorn
from transformers import WhisperProcessor, WhisperForConditionalGeneration
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import uuid
import subprocess
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi import UploadFile, File
# --- Modular Classes ---

class STTModule:
    def __init__(self, model_path="model/whisper", sample_rate=16000):
        self.processor = WhisperProcessor.from_pretrained(model_path)
        self.model = WhisperForConditionalGeneration.from_pretrained(model_path)
        self.sample_rate = sample_rate

    def transcribe(self, audio_path):
        audio, sr = librosa.load(audio_path, sr=self.sample_rate, mono=True)
        waveform = torch.tensor(audio).unsqueeze(0)
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)
        input_features = self.processor(
            waveform.squeeze().numpy(), sampling_rate=self.sample_rate, return_tensors="pt"
        ).input_features
        predicted_ids = self.model.generate(input_features)
        transcription = self.processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        return transcription

class MemoryModule:
    def __init__(self, embedding_model_name="intfloat/e5-small", db_path="./chromadb_data"):
        self.embedding_model = SentenceTransformer(embedding_model_name)
        self.client = chromadb.PersistentClient(path=db_path, settings=Settings(anonymized_telemetry=False))
        self.collection = self.client.get_or_create_collection(name="memory")
        if not self.collection.count():
            text = "You are adam and AI chatbot agent for me. You have to help me with questions about several areas."
            embedding = self.embedding_model.encode(text).tolist()
            self.collection.add(documents=[text], embeddings=[embedding], ids=["return_policy_1"])

    def add_memory(self, text):
        embedding = self.embedding_model.encode(text).tolist()
        self.collection.add(documents=[text], embeddings=[embedding], ids=[str(uuid.uuid4())])

    def retrieve(self, query, n_results=3):
        query_embedding = self.embedding_model.encode(query).tolist()
        results = self.collection.query(query_embeddings=[query_embedding], n_results=n_results)
        return results['documents'][0]

class LLMModule:
    def __init__(self, model_name="llama3"):
        self.model_name = model_name

    def query(self, prompt):
        result = subprocess.run(
            ['ollama', 'run', self.model_name],
            input=prompt.encode(),
            capture_output=True
        )
        return result.stdout.decode().strip()

# --- FastAPI App ---

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

stt = STTModule(model_path="model/whisper")
memory = MemoryModule()
llm = LLMModule()

class QueryRequest(BaseModel):
    query: str

@app.post("/rag")
async def rag_endpoint(request: QueryRequest):
    query = request.query
    context_docs = memory.retrieve(query)
    context = "\n".join(context_docs)
    prompt = f"[User Question]: {query} [Relevant Info]: {context} [Answer]:"
    response = llm.query(prompt)
    memory.add_memory(query)
    return {"response": response.strip()}

@app.post("/stt-rag")
async def stt_rag_endpoint(file: UploadFile = File(...)):
    # Save uploaded file temporarily
    temp_path = f"temp_{uuid.uuid4()}.wav"
    with open(temp_path, "wb") as f:
        f.write(await file.read())
    # Transcribe
    query = stt.transcribe(temp_path)
    # RAG pipeline
    context_docs = memory.retrieve(query)
    context = "\n".join(context_docs)
    prompt = f"[User Question]: {query} [Relevant Info]: {context} [Answer]:"
    response = llm.query(prompt)
    memory.add_memory(query)
    return {"transcription": query, "response": response.strip()}


@app.post("/load-conversations")
async def load_conversations_endpoint(file: UploadFile = File(...)):
    # Read uploaded file contents
    contents = await file.read()
    data = json.loads(contents.decode("utf-8"))

    # Count total messages to load
    total = 0
    for conv in data:
        if "mapping" in conv:
            for message_id, message_data in conv["mapping"].items():
                if message_data.get("message") and message_data["message"].get("content"):
                    content_parts = message_data["message"]["content"].get("parts", [])
                    total += sum(1 for part in content_parts if isinstance(part, str) and part.strip())

    # Load and show percent progress
    count = 0
    for conv in data:
        if "mapping" in conv:
            for message_id, message_data in conv["mapping"].items():
                if message_data.get("message") and message_data["message"].get("content"):
                    content_parts = message_data["message"]["content"].get("parts", [])
                    for part in content_parts:
                        if isinstance(part, str) and part.strip():
                            memory.add_memory(part.strip())
                            count += 1
                            if total > 0 and count % 100 == 0:
                                percent = (count / total) * 100
                                print(f"Progress: {percent:.2f}% ({count}/{total})")

    return {"loaded": count, "total": total, "percent": (count / total) * 100 if total else 100}

if __name__ == "__main__":
    uvicorn.run("agent:app", host="0.0.0.0", port=8080, reload=True)