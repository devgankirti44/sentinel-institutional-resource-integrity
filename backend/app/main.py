import os
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app import models

from app.routers.inventory    import router as inventory_router
from app.routers.cases        import router as cases_router
from app.routers.demo         import router as demo_router
from app.routers.procurement  import router as procurement_router
from app.routers.auth         import router as auth_router
from app.routers.assets       import router as assets_router
from app.routers.operations   import router as operations_router
from app.routers.explorer     import router as explorer_router
from app.routers.payments     import router as payments_router

from app.seed import seed_data

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sentinel")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    seed_data()

app.include_router(inventory_router)
app.include_router(cases_router)
app.include_router(demo_router)
app.include_router(procurement_router)
app.include_router(auth_router)
app.include_router(assets_router)
app.include_router(operations_router)
app.include_router(explorer_router)
app.include_router(payments_router)

@app.get("/")
def root():
    return {"system": "Sentinel"}