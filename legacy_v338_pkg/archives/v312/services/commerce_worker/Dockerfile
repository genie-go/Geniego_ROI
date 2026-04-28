FROM python:3.11-slim

WORKDIR /app
COPY services/commerce_worker/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY services/commerce_worker/commerce_worker.py /app/commerce_worker.py

CMD ["python", "-u", "/app/commerce_worker.py"]
