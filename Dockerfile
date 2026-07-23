FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (excluding .dockerignore'd files)
COPY . .

# Create a non-root user for security
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port (Render sets PORT env var)
EXPOSE 8000

# Use exec form for proper signal handling; PORT env var fallback to 8000
CMD exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
