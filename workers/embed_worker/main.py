from fastapi import FastAPI

app = FastAPI(title="embed-worker")


@app.get("/health")
def health():
    return {"status": "ok"}

