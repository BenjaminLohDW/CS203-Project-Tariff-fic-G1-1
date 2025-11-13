# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV FLASK_APP=app.py
ENV FLASK_ENV=development

# Set working directory in the container
WORKDIR /app

# Install system dependencies
# RUN apt-get update && \
#     apt-get install -y --no-install-recommends gcc python3-dev libpq-dev && \
#     rm -rf /var/lib/apt/lists/*

# Copy requirements file first to leverage Docker cache
COPY history/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the shared module (for Firebase authentication)
COPY shared /app/shared

# Copy the application file (not __init__.py to avoid package structure)
COPY history/app.py ./
COPY history/migrations ./migrations/

# Expose the port the app runs on
EXPOSE 5003

# Command to run the application
CMD ["flask", "run", "--host=0.0.0.0", "--port=5003"]