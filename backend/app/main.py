from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine
from .routers import auth, users, properties, assets, inventory, procurement, analytics, admin

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ManageWare API")

# --- Middleware ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Router Inclusions ---

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(properties.router)
app.include_router(assets.router)
app.include_router(inventory.router)
app.include_router(procurement.router)
app.include_router(analytics.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to ManageWare API (Modular)"}
