#!/usr/bin/env python
import uvicorn
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
from app.main import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
