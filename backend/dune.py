import os
import time
import httpx

DUNE_API_BASE = "https://api.dune.com/api/v1"


def _headers():
    return {
        "X-Dune-API-Key": os.environ["DUNE_API_KEY"],
        "Content-Type": "application/json",
    }


async def execute_query(sql: str, timeout: float = 120) -> dict:
    """Execute a DuneSQL query and return the results. Polls until complete."""
    async with httpx.AsyncClient(timeout=30) as client:
        # Step 1: Submit
        resp = await client.post(
            f"{DUNE_API_BASE}/sql/execute",
            headers=_headers(),
            json={"sql": sql, "performance": "medium"},
        )
        resp.raise_for_status()
        execution_id = resp.json()["execution_id"]

        # Step 2: Poll until done
        start = time.time()
        while time.time() - start < timeout:
            status_resp = await client.get(
                f"{DUNE_API_BASE}/execution/{execution_id}/status",
                headers=_headers(),
            )
            status_resp.raise_for_status()
            state = status_resp.json()["state"]

            if state == "QUERY_STATE_COMPLETED":
                break
            elif state in ("QUERY_STATE_FAILED", "QUERY_STATE_CANCELLED"):
                error = status_resp.json().get("error", "Query failed")
                raise Exception(f"Query {state}: {error}")

            await _async_sleep(2)
        else:
            raise Exception("Query timed out after {timeout}s")

        # Step 3: Fetch results
        results_resp = await client.get(
            f"{DUNE_API_BASE}/execution/{execution_id}/results",
            headers=_headers(),
            params={"limit": 500},
        )
        results_resp.raise_for_status()
        data = results_resp.json()

        return {
            "rows": data.get("result", {}).get("rows", []),
            "metadata": data.get("result", {}).get("metadata", {}),
            "execution_id": execution_id,
        }


async def _async_sleep(seconds):
    import asyncio
    await asyncio.sleep(seconds)
