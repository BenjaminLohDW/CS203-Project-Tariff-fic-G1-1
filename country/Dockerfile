# Use an official Python runtime as a parent image
FROM python:3.9-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py
ENV FLASK_ENV=development

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .


COPY migrations/ /app/migrations/
COPY data/ /app/data/
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

COPY countries_full.csv ./countries_full.csv
COPY country_relations_all.csv ./country_relations_all.csv

EXPOSE 5005

# CMD ["python", "app.py"]

CMD ["/app/entrypoint.sh"]