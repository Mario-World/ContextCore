FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Install git for repository cloning capabilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Expose port (Cloud Run sets $PORT dynamically)
EXPOSE 8080

# Run FastAPI app with uvicorn bound to $PORT
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
