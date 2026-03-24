FROM python:3.11-slim
WORKDIR /app
COPY services/journey_executor/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/journey_executor/ .
CMD ["python","-u","journey_executor.py"]
