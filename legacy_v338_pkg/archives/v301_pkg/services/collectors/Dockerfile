FROM python:3.11-slim
WORKDIR /app
COPY services/collectors/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/collectors/ .
CMD ["python","-u","collector.py"]
