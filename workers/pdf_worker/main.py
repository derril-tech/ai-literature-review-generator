from fastapi import FastAPI

app = FastAPI(title="pdf-worker")


@app.get("/health")
def health():
    return {"status": "ok"}

