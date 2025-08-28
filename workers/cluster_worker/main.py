from fastapi import FastAPI

app = FastAPI(title="cluster-worker")


@app.get("/health")
def health():
    return {"status": "ok"}

