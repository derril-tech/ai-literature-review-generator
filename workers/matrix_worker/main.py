from fastapi import FastAPI

app = FastAPI(title="matrix-worker")


@app.get("/health")
def health():
    return {"status": "ok"}
