# Use a small base
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py
ENV FLASK_ENV=development

WORKDIR /app

COPY agreement/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the shared module (for Firebase authentication)
COPY shared /app/shared

COPY agreement/ .

EXPOSE 5006

CMD ["python", "app.py"]
