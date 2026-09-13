FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake the sentence-embedding weights into the image so a fresh container never
# reaches out to the Hugging Face hub at boot.
ARG MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
ENV MODEL_NAME=${MODEL_NAME}
ENV HF_HOME=/app/models
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('${MODEL_NAME}')"

COPY app ./app

ENV PORT=8004
EXPOSE 8004

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8004"]
