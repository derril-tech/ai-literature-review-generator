from fastapi import FastAPI

app = FastAPI(title="summary-worker")


@app.get("/health")
def health():
    return {"status": "ok"}
