from fastapi import FastAPI

app = FastAPI(title="label-worker")


@app.get("/health")
def health():
    return {"status": "ok"}

