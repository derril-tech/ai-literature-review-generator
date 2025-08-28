from fastapi import FastAPI

app = FastAPI(title="bundle-worker")


@app.get("/health")
def health():
    return {"status": "ok"}
