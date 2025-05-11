import fastapi

app = fastapi.FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

@app.post("/content")
def get_content(interests: str):
    return {"message": "Hello, World!"}
