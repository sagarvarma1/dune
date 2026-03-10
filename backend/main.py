from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from llm import nl_to_sql
from dune import execute_query

app = FastAPI(title="Dune NL Query")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    sql: str
    rows: list[dict]
    metadata: dict


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty")

    try:
        sql = nl_to_sql(req.question)
    except Exception as e:
        raise HTTPException(500, f"Failed to generate SQL: {e}")

    try:
        result = await execute_query(sql)
    except Exception as e:
        raise HTTPException(500, f"Dune query failed: {e}")

    return QueryResponse(
        sql=sql,
        rows=result["rows"],
        metadata=result["metadata"],
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
