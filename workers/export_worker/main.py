from fastapi import FastAPI

app = FastAPI(title="export-worker")


@app.get("/health")
def health():
    return {"status": "ok"}
