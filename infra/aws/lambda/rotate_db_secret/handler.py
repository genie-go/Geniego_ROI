import json
import os
import logging
import boto3
import base64
import random
import string

logger = logging.getLogger()
logger.setLevel(os.getenv("LOG_LEVEL","INFO"))

secrets = boto3.client("secretsmanager")

# Optional: Postgres driver. For full end-to-end rotation, install deps:
#   pip install -r requirements.txt -t .
try:
    import psycopg2
except Exception:
    psycopg2 = None

def _rand_pw(length=32):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
    return "".join(random.choice(alphabet) for _ in range(length))

def _get_secret_dict(secret_arn, stage):
    resp = secrets.get_secret_value(SecretId=secret_arn, VersionStage=stage)
    if "SecretString" in resp and resp["SecretString"]:
        return json.loads(resp["SecretString"])
    # SecretBinary support
    return json.loads(base64.b64decode(resp["SecretBinary"]).decode("utf-8"))

def _put_secret_dict(secret_arn, token, secret_dict, stage):
    secrets.put_secret_value(
        SecretId=secret_arn,
        ClientRequestToken=token,
        SecretString=json.dumps(secret_dict),
        VersionStages=[stage],
    )

def _connect_and_set_password(host, port, dbname, user, current_password, new_user, new_password):
    if psycopg2 is None:
        # In IaC baseline we keep this as a hard failure to avoid silent success.
        raise RuntimeError("psycopg2 is not available in the Lambda package. Install deps per requirements.txt.")
    conn = psycopg2.connect(
        host=host, port=port, dbname=dbname, user=user, password=current_password, connect_timeout=8
    )
    conn.autocommit = True
    with conn.cursor() as cur:
        # For simplicity we rotate the same username's password.
        # If you prefer alternating users, extend secret schema with 'alt_username'.
        cur.execute(f"ALTER USER {new_user} WITH PASSWORD %s", (new_password,))
    conn.close()

def handler(event, context):
    """
    Secrets Manager rotation Lambda (PostgreSQL) - 4-step implementation:
      - createSecret
      - setSecret
      - testSecret
      - finishSecret

    Secret JSON schema (recommended):
      {
        "engine": "postgres",
        "host": "...",
        "port": 5432,
        "dbname": "genie",
        "username": "genie",
        "password": "...."
      }
    """
    secret_arn = event["SecretId"]
    token = event["ClientRequestToken"]
    step = event["Step"]

    meta = secrets.describe_secret(SecretId=secret_arn)
    if not meta.get("RotationEnabled"):
        raise ValueError("Secret rotation is not enabled for this secret.")

    if token not in meta["VersionIdsToStages"]:
        raise ValueError("Secret version token not found.")
    if "AWSPENDING" not in meta["VersionIdsToStages"][token]:
        raise ValueError("Secret version is not set as AWSPENDING for rotation.")

    if step == "createSecret":
        return create_secret(secret_arn, token)
    if step == "setSecret":
        return set_secret(secret_arn, token)
    if step == "testSecret":
        return test_secret(secret_arn, token)
    if step == "finishSecret":
        return finish_secret(secret_arn, token)

    raise ValueError(f"Unknown step: {step}")

def create_secret(secret_arn, token):
    try:
        _ = secrets.get_secret_value(SecretId=secret_arn, VersionId=token, VersionStage="AWSPENDING")
        logger.info("createSecret: AWSPENDING already exists.")
        return {"ok": True}
    except secrets.exceptions.ResourceNotFoundException:
        pass
    except Exception:
        # if pending exists but not retrievable, proceed to overwrite
        pass

    current = _get_secret_dict(secret_arn, "AWSCURRENT")
    pending = dict(current)
    pending["password"] = _rand_pw()
    _put_secret_dict(secret_arn, token, pending, "AWSPENDING")
    logger.info("createSecret: created AWSPENDING secret.")
    return {"ok": True}

def set_secret(secret_arn, token):
    current = _get_secret_dict(secret_arn, "AWSCURRENT")
    pending = _get_secret_dict(secret_arn, "AWSPENDING")

    host = pending["host"]
    port = int(pending.get("port", 5432))
    dbname = pending.get("dbname") or pending.get("database") or "postgres"

    username = pending["username"]
    new_password = pending["password"]

    # Rotate same user by default
    _connect_and_set_password(
        host=host,
        port=port,
        dbname=dbname,
        user=current["username"],
        current_password=current["password"],
        new_user=username,
        new_password=new_password,
    )
    logger.info("setSecret: updated DB user password.")
    return {"ok": True}

def test_secret(secret_arn, token):
    pending = _get_secret_dict(secret_arn, "AWSPENDING")
    host = pending["host"]
    port = int(pending.get("port", 5432))
    dbname = pending.get("dbname") or pending.get("database") or "postgres"
    username = pending["username"]
    password = pending["password"]

    if psycopg2 is None:
        raise RuntimeError("psycopg2 is not available in the Lambda package. Install deps per requirements.txt.")

    conn = psycopg2.connect(host=host, port=port, dbname=dbname, user=username, password=password, connect_timeout=8)
    conn.close()
    logger.info("testSecret: connection ok.")
    return {"ok": True}

def finish_secret(secret_arn, token):
    meta = secrets.describe_secret(SecretId=secret_arn)
    current_version = None
    for ver, stages in meta["VersionIdsToStages"].items():
        if "AWSCURRENT" in stages:
            current_version = ver
            break

    secrets.update_secret_version_stage(
        SecretId=secret_arn,
        VersionStage="AWSCURRENT",
        MoveToVersionId=token,
        RemoveFromVersionId=current_version,
    )
    logger.info("finishSecret: promoted AWSPENDING to AWSCURRENT.")
    return {"ok": True}
