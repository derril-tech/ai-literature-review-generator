from fastapi import FastAPI

app = FastAPI(title="meta-worker")


@app.get("/health")
def health():
    return {"status": "ok"}

