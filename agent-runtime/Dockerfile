FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create standard directories for agent operations
RUN mkdir -p /data /workspace /tmp

# Non-root user — agents run unprivileged
RUN useradd -r -u 1001 -s /bin/false agent && \
    chown -R agent:agent /app /workspace && \
    chmod 777 /tmp

USER agent

# Default command — overridden by orchestrator with actual args
CMD ["python", "agent_runner.py", "--help"]
