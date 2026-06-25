from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Отдаём frontend папку как статику
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")