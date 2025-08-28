from fastapi import FastAPI

app = FastAPI(title="rag-worker")


@app.get("/health")
def health():
    return {"status": "ok"}
