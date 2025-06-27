FROM nvcr.io/nvidia/rapidsai/base:23.12-cuda12.0-py3.10

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000","--reload"]